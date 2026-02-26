import { NextRequest, NextResponse } from 'next/server'
import { findMatchingBots, autoAssignTask, getMatchSuggestions, TaskRequirements } from '@/lib/matching'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/tasks/match?taskId=xxx
 * Get match suggestions for a task
 * 
 * Or preview matches without a task:
 * GET /api/tasks/match?budget=1000&capabilities=coding,research
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')
  const budget = searchParams.get('budget')
  const capabilities = searchParams.get('capabilities')
  const tools = searchParams.get('tools')
  const limit = parseInt(searchParams.get('limit') || '5')

  try {
    if (taskId) {
      // Get matches for existing task
      const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (error || !task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const matches = await findMatchingBots(
        taskId,
        task.requirements || {},
        task.max_budget,
        limit
      )

      return NextResponse.json({
        task: { id: task.id, title: task.title, max_budget: task.max_budget },
        matches: matches.map(m => ({
          bot: {
            id: m.bot.id,
            name: m.bot.name,
            description: m.bot.description,
            capabilities: m.bot.capabilities,
            per_task_rate: m.bot.per_task_rate,
            avg_rating: m.bot.avg_rating,
            total_tasks_completed: m.bot.total_tasks_completed
          },
          score: m.score,
          reasons: m.reasons
        }))
      })
    } else if (budget) {
      // Preview matches for given requirements
      const requirements: TaskRequirements = {}
      
      if (capabilities) {
        requirements.capabilities = capabilities.split(',').map(c => c.trim())
      }
      if (tools) {
        requirements.tools = tools.split(',').map(t => t.trim())
      }

      const matches = await getMatchSuggestions(
        requirements,
        parseInt(budget),
        limit
      )

      return NextResponse.json({
        query: { budget: parseInt(budget), requirements },
        matches: matches.map(m => ({
          bot: {
            id: m.bot.id,
            name: m.bot.name,
            description: m.bot.description,
            capabilities: m.bot.capabilities,
            per_task_rate: m.bot.per_task_rate,
            avg_rating: m.bot.avg_rating,
            total_tasks_completed: m.bot.total_tasks_completed
          },
          score: m.score,
          reasons: m.reasons
        }))
      })
    } else {
      return NextResponse.json(
        { error: 'Provide taskId or budget parameter' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Match error:', error)
    return NextResponse.json({ error: 'Matching failed' }, { status: 500 })
  }
}

/**
 * POST /api/tasks/match
 * Auto-assign a task to the best matching bot
 * 
 * Body: { taskId: string, autoAssign?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, autoAssign = true } = body

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 })
    }

    if (autoAssign) {
      const result = await autoAssignTask(taskId)
      
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      // Get assigned bot details
      const { data: bot } = await supabase
        .from('bots')
        .select('id, name, webhook_url')
        .eq('id', result.botId)
        .single()

      return NextResponse.json({
        success: true,
        assigned: {
          taskId,
          botId: result.botId,
          botName: bot?.name
        },
        message: `Task assigned to ${bot?.name}`
      })
    } else {
      // Just get matches without assigning
      const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (error || !task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      const matches = await findMatchingBots(
        taskId,
        task.requirements || {},
        task.max_budget,
        5
      )

      return NextResponse.json({
        success: true,
        matches: matches.map(m => ({
          bot: { id: m.bot.id, name: m.bot.name },
          score: m.score,
          reasons: m.reasons
        }))
      })
    }
  } catch (error) {
    console.error('Match POST error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
