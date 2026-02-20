-- Hive Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  user_type TEXT NOT NULL DEFAULT 'renter' CHECK (user_type IN ('owner', 'renter', 'both')),
  stripe_account_id TEXT,
  stripe_customer_id TEXT,
  reputation_score DECIMAL(3,2) DEFAULT 5.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bots table
CREATE TABLE public.bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  capabilities TEXT[] DEFAULT '{}',
  tools TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy')),
  hourly_rate INTEGER DEFAULT 0, -- in cents
  per_task_rate INTEGER DEFAULT 100, -- in cents, default $1
  total_tasks_completed INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  webhook_url TEXT NOT NULL,
  auth_token_hash TEXT NOT NULL,
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'running', 'completed', 'failed', 'disputed', 'cancelled')),
  result TEXT,
  result_artifacts TEXT[] DEFAULT '{}',
  cost INTEGER DEFAULT 0, -- in cents
  max_budget INTEGER NOT NULL, -- in cents
  deadline TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES public.profiles(id),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  amount INTEGER NOT NULL, -- total in cents
  platform_fee INTEGER NOT NULL, -- 15%
  owner_payout INTEGER NOT NULL, -- 85%
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'completed', 'refunded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  reviewee_type TEXT NOT NULL CHECK (reviewee_type IN ('bot', 'renter')),
  reviewee_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_bots_owner ON public.bots(owner_id);
CREATE INDEX idx_bots_status ON public.bots(status);
CREATE INDEX idx_tasks_renter ON public.tasks(renter_id);
CREATE INDEX idx_tasks_bot ON public.tasks(assigned_bot_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_transactions_task ON public.transactions(task_id);
CREATE INDEX idx_reviews_task ON public.reviews(task_id);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Bots policies
CREATE POLICY "Public bots are viewable by everyone" ON public.bots
  FOR SELECT USING (true);

CREATE POLICY "Owners can insert own bots" ON public.bots
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own bots" ON public.bots
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own bots" ON public.bots
  FOR DELETE USING (auth.uid() = owner_id);

-- Tasks policies
CREATE POLICY "Tasks viewable by renter and assigned bot owner" ON public.tasks
  FOR SELECT USING (
    auth.uid() = renter_id OR 
    auth.uid() IN (SELECT owner_id FROM public.bots WHERE id = assigned_bot_id)
  );

CREATE POLICY "Renters can insert tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Renters can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = renter_id);

-- Transactions policies
CREATE POLICY "Transactions viewable by involved parties" ON public.transactions
  FOR SELECT USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Reviews policies  
CREATE POLICY "Reviews are public" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews for their tasks" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update bot average rating
CREATE OR REPLACE FUNCTION public.update_bot_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reviewee_type = 'bot' THEN
    UPDATE public.bots
    SET avg_rating = (
      SELECT AVG(rating) FROM public.reviews 
      WHERE reviewee_type = 'bot' AND reviewee_id = NEW.reviewee_id
    )
    WHERE id = NEW.reviewee_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for rating updates
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_bot_rating();
