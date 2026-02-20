import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Bot submits task result
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
      .select('id')
      .eq('auth_token_hash', tokenHash)
      .single()

    if (findError || !bot) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 })
    }

    const body = await request.json()
    const { task_id, result, result_artifacts, success } = body

    if (!task_id) {
      return NextResponse.json({ error: 'Missing task_id' }, { status: 400 })
    }

    // Verify task is assigned to this bot
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .eq('assigned_bot_id', bot.id)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found or not assigned to you' }, { status: 404 })
    }

    if (task.status !== 'running' && task.status !== 'assigned') {
      return NextResponse.json({ error: 'Task is not in a valid state for submission' }, { status: 400 })
    }

    // Update task with result
    const newStatus = success ? 'completed' : 'failed'
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: newStatus,
        result: result || null,
        result_artifacts: result_artifacts || [],
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', task_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update bot stats
    if (success) {
      await supabase
        .from('bots')
        .update({
          total_tasks_completed: bot.total_tasks_completed + 1,
          status: 'online',
          updated_at: new Date().toISOString()
        })
        .eq('id', bot.id)
    } else {
      await supabase
        .from('bots')
        .update({
          status: 'online',
          updated_at: new Date().toISOString()
        })
        .eq('id', bot.id)
    }

    // TODO: Trigger payment capture if completed successfully

    return NextResponse.json({ 
      ok: true,
      task_id,
      status: newStatus
    })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
