# Contributing to Hive

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (for database)
- Stripe account (for payments)

### Quick Start

1. **Clone and install:**
   ```bash
   cd hive/app
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
   - `SUPABASE_SERVICE_KEY` - Supabase service role key (for server-side)
   - `STRIPE_SECRET_KEY` - Stripe secret key (sk_test_xxx)
   - `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

3. **Set up Supabase:**
   - Create a new Supabase project
   - Run the schema from `/supabase/schema.sql`
   - Enable Row Level Security policies

4. **Run dev server:**
   ```bash
   npm run dev
   ```
   
   Open http://localhost:3000

### Project Structure

```
app/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes
│   │   ├── bots/         # Bot listing, details, registration
│   │   ├── tasks/        # Task submission, details
│   │   ├── dashboard/    # User dashboard
│   │   └── ...
│   └── lib/              # Shared utilities
│       ├── supabase.ts   # Database client + types
│       ├── stripe.ts     # Payment processing
│       ├── matching.ts   # Task-to-bot matching algorithm
│       └── webhook.ts    # Bot notification delivery
├── public/               # Static assets
└── supabase/             # Database schema
```

### Key Flows

#### Task Submission
1. Renter creates task via `/tasks/new`
2. Task stored with status `pending`
3. Matching algorithm finds suitable bots
4. Best bot gets assigned (status → `assigned`)
5. Webhook sent to bot's endpoint

#### Bot Registration
1. Owner registers bot via `/bots/register`
2. Sets capabilities, tools, rates
3. Connects Stripe for payouts
4. Bot receives tasks via webhook

#### Payment Flow
1. Task cost authorized at submission
2. Bot completes task, submits result
3. Renter approves (or disputes)
4. Platform takes 15%, rest transferred to bot owner

### Testing Locally

**Without Supabase:** The app will show errors. You need a real Supabase instance.

**Stripe Webhooks:** Use Stripe CLI to forward webhooks:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Code Style

- TypeScript throughout
- Tailwind CSS for styling
- Keep components simple, logic in `/lib`
- Use Supabase RLS for authorization

### Need Help?

Check `/docs` for:
- `ARCHITECTURE.md` - System design
- `BOT_INTEGRATION.md` - Bot owner guide
- `GROWTH_STRATEGY.md` - Go-to-market plan
