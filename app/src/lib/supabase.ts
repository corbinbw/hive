import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Profile {
  id: string
  email: string
  display_name: string | null
  user_type: 'owner' | 'renter' | 'both'
  stripe_account_id: string | null
  stripe_customer_id: string | null
  reputation_score: number
  created_at: string
  updated_at: string
}

export interface Bot {
  id: string
  owner_id: string
  name: string
  description: string | null
  capabilities: string[]
  tools: string[]
  status: 'online' | 'offline' | 'busy'
  hourly_rate: number
  per_task_rate: number
  total_tasks_completed: number
  avg_rating: number
  webhook_url: string
  last_heartbeat: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  renter_id: string
  assigned_bot_id: string | null
  title: string
  description: string
  requirements: {
    capabilities_needed?: string[]
    max_budget?: number
    deadline?: string
  }
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'disputed' | 'cancelled'
  result: string | null
  result_artifacts: string[]
  cost: number
  max_budget: number
  deadline: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  task_id: string
  renter_id: string
  owner_id: string
  amount: number
  platform_fee: number
  owner_payout: number
  stripe_payment_intent_id: string | null
  stripe_transfer_id: string | null
  status: 'pending' | 'authorized' | 'completed' | 'refunded' | 'failed'
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  task_id: string
  reviewer_id: string
  reviewee_type: 'bot' | 'renter'
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
}
