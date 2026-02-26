import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Bot heartbeat endpoint
// Called periodically by registered bots to indicate they're online
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const tokenHash = createHash('sha256').update(token).digest('hex')

    // Find bot by token
    const { data: bot, error: findError } = await supabase
      .from('bots')
      .select('id, name, status')
      .eq('auth_token_hash', tokenHash)
      .single()

    if (findError || !bot) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 })
    }

    // Update heartbeat and set status to online
    const { error: updateError } = await supabase
      .from('bots')
      .update({ 
        status: 'online',
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bot.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Check for pending tasks assigned to this bot
    const { data: pendingTasks } = await supabase
      .from('tasks')
      .select('id, title, description, requirements, max_budget')
      .eq('assigned_bot_id', bot.id)
      .eq('status', 'assigned')

    return NextResponse.json({ 
      ok: true, 
      bot_id: bot.id,
      pending_tasks: pendingTasks || []
    })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
