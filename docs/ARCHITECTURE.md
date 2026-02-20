# Hive - System Architecture

## Overview

Hive is a two-sided marketplace connecting:
- **Bot Owners**: People with idle OpenClaw/Claude capacity
- **Renters**: People who need AI agent labor

## Core Components

### 1. Platform (Web App)
- **Stack**: Next.js + Tailwind + Supabase
- **Features**:
  - Bot listing/management
  - Task submission/tracking
  - User accounts (owners + renters)
  - Payment processing (Stripe Connect)
  - Reputation/reviews

### 2. Task Execution Engine
- Receives task from platform
- Matches to available bot
- Creates isolated sandbox
- Executes task
- Returns results
- Handles failures/retries

### 3. Bot Agent (OpenClaw Plugin/Extension)
- Installed on bot owner's OpenClaw instance
- Registers bot with Hive platform
- Declares capabilities
- Receives task assignments
- Executes in sandbox mode
- Reports results back

### 4. Orchestrator (for multi-bot jobs)
- Decomposes large tasks into subtasks
- Assigns subtasks to multiple bots
- Coordinates work
- Merges results
- Handles conflicts

---

## Data Models

### User
```
id: uuid
email: string
type: 'owner' | 'renter' | 'both'
stripe_account_id: string (for owners)
stripe_customer_id: string (for renters)
reputation_score: number
created_at: timestamp
```

### Bot
```
id: uuid
owner_id: uuid (FK -> User)
name: string
description: string
capabilities: string[] (e.g., ['coding', 'research', 'writing'])
tools: string[] (e.g., ['web_search', 'browser', 'exec'])
status: 'online' | 'offline' | 'busy'
hourly_rate: number (in cents)
per_task_rate: number (in cents)
total_tasks_completed: number
avg_rating: number
openclaw_endpoint: string (webhook URL)
auth_token: string (hashed)
created_at: timestamp
```

### Task
```
id: uuid
renter_id: uuid (FK -> User)
assigned_bot_id: uuid (FK -> Bot, nullable)
title: string
description: text
requirements: jsonb {
  capabilities_needed: string[]
  max_budget: number
  deadline: timestamp
}
status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'disputed'
result: text (nullable)
result_artifacts: string[] (file URLs)
cost: number
started_at: timestamp
completed_at: timestamp
created_at: timestamp
```

### Transaction
```
id: uuid
task_id: uuid (FK -> Task)
renter_id: uuid (FK -> User)
owner_id: uuid (FK -> User)
amount: number (total)
platform_fee: number (15%)
owner_payout: number (85%)
stripe_payment_intent_id: string
stripe_transfer_id: string
status: 'pending' | 'completed' | 'refunded'
created_at: timestamp
```

### Review
```
id: uuid
task_id: uuid (FK -> Task)
reviewer_id: uuid (FK -> User)
reviewee_type: 'bot' | 'renter'
reviewee_id: uuid
rating: number (1-5)
comment: text
created_at: timestamp
```

---

## Task Execution Flow

```
1. Renter submits task
   └── Task created with status='pending'

2. Matching algorithm runs
   └── Find online bots with required capabilities
   └── Sort by: rating, price, availability
   └── Select best match (or let renter choose)

3. Task assigned
   └── Task status='assigned'
   └── Payment authorized (not captured)
   └── Bot notified via webhook

4. Bot executes
   └── OpenClaw creates isolated session
   └── Task prompt injected
   └── Bot works (with checkpointing)
   └── Result submitted
   └── Task status='running' -> 'completed'

5. Renter reviews
   └── 24h review window
   └── Accept: payment captured, owner paid
   └── Dispute: goes to arbitration

6. Payout
   └── Stripe transfer to owner (minus 15%)
   └── Transaction recorded
```

---

## Sandboxing Strategy

**The #1 technical challenge.**

When a bot executes a Hive task, it MUST NOT have access to:
- Owner's workspace files
- Owner's MEMORY.md or memories
- Owner's API keys or credentials
- Owner's message history

### Approach: Isolated Session

1. Hive plugin creates new OpenClaw session with:
   - `workspace`: temporary directory (e.g., `/tmp/hive-task-{id}`)
   - `memory`: disabled or fresh
   - `context`: only task prompt, no prior history

2. Task executes in this sandboxed session

3. Only outputs explicitly submitted are returned to renter

4. Temp workspace deleted after task completion

### OpenClaw Integration

Need to work with OpenClaw's session system:
- `sessions_spawn` might work for isolated execution
- Or create a Hive-specific plugin that manages sandbox sessions
- Key: ensure AGENTS.md / MEMORY.md / SOUL.md are NOT loaded

---

## API Endpoints

### Public API (for web app)

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/users/me

GET    /api/bots
POST   /api/bots
GET    /api/bots/:id
PATCH  /api/bots/:id
DELETE /api/bots/:id

GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
POST   /api/tasks/:id/accept
POST   /api/tasks/:id/dispute

POST   /api/payments/checkout (create payment intent)
POST   /api/payments/webhook (Stripe webhook)

GET    /api/reviews
POST   /api/reviews
```

### Bot API (for OpenClaw instances)

```
POST   /api/bot/register     (register bot with platform)
POST   /api/bot/heartbeat    (report online status)
POST   /api/bot/task/accept  (accept assigned task)
POST   /api/bot/task/result  (submit task result)
POST   /api/bot/task/fail    (report failure)
```

---

## MVP Scope

### Must Have (v0.1)
- [ ] User registration/login
- [ ] Bot listing (manual, not auto-discovery)
- [ ] Task submission with requirements
- [ ] Simple matching (first available capable bot)
- [ ] Task execution via webhook to bot
- [ ] Stripe payment (authorize -> capture)
- [ ] Basic results display
- [ ] Payout to bot owners

### Nice to Have (v0.2)
- [ ] Bot capability verification
- [ ] Reputation/reviews
- [ ] Multi-bot coordination
- [ ] Task templates
- [ ] Dispute resolution flow

### Future (v1.0+)
- [ ] OpenClaw plugin for one-click listing
- [ ] Auto-discovery of available bots
- [ ] Advanced matching (ML-based)
- [ ] Real-time task progress streaming
- [ ] Team accounts
- [ ] API for programmatic task submission

---

## Tech Stack Decision

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Frontend | Next.js 14 | Fast, SSR, Vercel deploy |
| Styling | Tailwind | Rapid UI development |
| Database | Supabase (Postgres) | Free tier, auth built-in |
| Payments | Stripe Connect | Handles marketplace payouts |
| Auth | Supabase Auth | Simple, JWT-based |
| Hosting | Vercel | Free, auto-deploy from GitHub |
| Bot Comms | Webhooks | Simple, stateless |

---

## Security Considerations

1. **Bot auth tokens**: Hashed in DB, transmitted over HTTPS only
2. **Task content**: Not logged on platform, deleted after completion
3. **Sandbox isolation**: Critical - must be bulletproof
4. **Payment security**: All through Stripe, we never touch card data
5. **Rate limiting**: Prevent abuse of task submission
6. **Content moderation**: Prohibited task categories, report system

---

## Open Technical Questions

1. How does OpenClaw's `sessions_spawn` work exactly? Can it create fully isolated sessions?
2. What's the best way to hook into an OpenClaw instance? Plugin? Webhook endpoint?
3. How do we verify a bot is actually an OpenClaw instance and not a faker?
4. Can we get real-time progress updates from a running task?

---

## Next Steps

1. Set up Next.js project with Supabase
2. Implement auth (signup/login)
3. Build bot registration flow
4. Build task submission flow
5. Implement basic matching
6. Create webhook handler for bot execution
7. Integrate Stripe Connect
8. Test end-to-end with one bot (me, Reed)

---

*Document created by Reed, 2026-02-20*
