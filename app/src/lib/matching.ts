/**
 * Hive Task Matching Algorithm
 * 
 * Matches tasks to available bots based on:
 * - Capabilities (required vs available)
 * - Budget (bot rate <= task max budget)
 * - Bot availability (online status)
 * - Bot reputation (rating + completion count)
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export interface TaskRequirements {
  capabilities?: string[]
  tools?: string[]
  min_rating?: number
  prefer_fastest?: boolean
  prefer_cheapest?: boolean
}

export interface Bot {
  id: string
  owner_id: string
  name: string
  description: string
  capabilities: string[]
  tools: string[]
  status: 'online' | 'offline' | 'busy'
  hourly_rate: number
  per_task_rate: number
  total_tasks_completed: number
  avg_rating: number
  webhook_url: string
  last_heartbeat: string
}

export interface MatchResult {
  bot: Bot
  score: number
  reasons: string[]
}

/**
 * Calculate match score for a bot against task requirements
 * Higher score = better match
 */
function calculateMatchScore(
  bot: Bot,
  requirements: TaskRequirements,
  maxBudget: number
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Base score for being online
  if (bot.status === 'online') {
    score += 100
    reasons.push('Bot is online and available')
  } else {
    return { score: 0, reasons: ['Bot is not available'] }
  }

  // Check budget fit
  if (bot.per_task_rate <= maxBudget) {
    score += 50
    // Bonus for being under budget
    const budgetRatio = 1 - (bot.per_task_rate / maxBudget)
    score += Math.floor(budgetRatio * 30)
    reasons.push(`Rate $${(bot.per_task_rate / 100).toFixed(2)} within budget`)
  } else {
    return { score: 0, reasons: ['Bot rate exceeds budget'] }
  }

  // Check capability match
  const requiredCaps = requirements.capabilities || []
  if (requiredCaps.length > 0) {
    const matchedCaps = requiredCaps.filter(cap => 
      bot.capabilities.some(botCap => 
        botCap.toLowerCase().includes(cap.toLowerCase()) ||
        cap.toLowerCase().includes(botCap.toLowerCase())
      )
    )
    const capMatchRatio = matchedCaps.length / requiredCaps.length
    
    if (capMatchRatio === 0) {
      return { score: 0, reasons: ['No matching capabilities'] }
    }
    
    score += Math.floor(capMatchRatio * 100)
    if (capMatchRatio === 1) {
      reasons.push(`All ${requiredCaps.length} required capabilities matched`)
    } else {
      reasons.push(`${matchedCaps.length}/${requiredCaps.length} capabilities matched`)
    }
  } else {
    score += 50 // No specific requirements = any bot works
    reasons.push('No specific capabilities required')
  }

  // Check tool requirements
  const requiredTools = requirements.tools || []
  if (requiredTools.length > 0) {
    const matchedTools = requiredTools.filter(tool =>
      bot.tools.some(botTool =>
        botTool.toLowerCase().includes(tool.toLowerCase()) ||
        tool.toLowerCase().includes(botTool.toLowerCase())
      )
    )
    const toolMatchRatio = matchedTools.length / requiredTools.length
    score += Math.floor(toolMatchRatio * 50)
    if (matchedTools.length > 0) {
      reasons.push(`${matchedTools.length}/${requiredTools.length} tools available`)
    }
  }

  // Reputation bonus
  if (bot.avg_rating > 0) {
    score += Math.floor(bot.avg_rating * 10) // Max 50 points for 5-star rating
    if (bot.avg_rating >= 4.5) {
      reasons.push(`Excellent rating: ${bot.avg_rating.toFixed(1)}⭐`)
    } else if (bot.avg_rating >= 4.0) {
      reasons.push(`Good rating: ${bot.avg_rating.toFixed(1)}⭐`)
    }
  }

  // Experience bonus
  if (bot.total_tasks_completed > 0) {
    const expBonus = Math.min(bot.total_tasks_completed * 2, 40) // Max 40 points
    score += expBonus
    if (bot.total_tasks_completed >= 10) {
      reasons.push(`Experienced: ${bot.total_tasks_completed} tasks completed`)
    }
  }

  // Check min rating requirement
  if (requirements.min_rating && bot.avg_rating < requirements.min_rating) {
    score = Math.floor(score * 0.5) // Heavy penalty but don't disqualify
    reasons.push(`Below preferred rating (${bot.avg_rating.toFixed(1)} < ${requirements.min_rating})`)
  }

  // Recent heartbeat bonus (active in last 5 minutes)
  if (bot.last_heartbeat) {
    const lastHeartbeat = new Date(bot.last_heartbeat)
    const minutesAgo = (Date.now() - lastHeartbeat.getTime()) / (1000 * 60)
    if (minutesAgo < 5) {
      score += 20
      reasons.push('Recently active')
    } else if (minutesAgo < 15) {
      score += 10
    }
  }

  return { score, reasons }
}

/**
 * Find matching bots for a task
 */
export async function findMatchingBots(
  taskId: string,
  requirements: TaskRequirements,
  maxBudget: number,
  limit: number = 5
): Promise<MatchResult[]> {
  // Get all online bots
  const { data: bots, error } = await supabase
    .from('bots')
    .select('*')
    .eq('status', 'online')
    .lte('per_task_rate', maxBudget)

  if (error || !bots) {
    console.error('Error fetching bots:', error)
    return []
  }

  // Score each bot
  const matches: MatchResult[] = []
  
  for (const bot of bots) {
    const { score, reasons } = calculateMatchScore(bot, requirements, maxBudget)
    if (score > 0) {
      matches.push({ bot, score, reasons })
    }
  }

  // Sort by score descending
  matches.sort((a, b) => {
    // If prefer_cheapest, factor in price
    if (requirements.prefer_cheapest) {
      const priceA = a.bot.per_task_rate
      const priceB = b.bot.per_task_rate
      if (priceA !== priceB) {
        return priceA - priceB // Cheaper first
      }
    }
    return b.score - a.score
  })

  return matches.slice(0, limit)
}

/**
 * Auto-assign task to best matching bot
 */
export async function autoAssignTask(
  taskId: string
): Promise<{ success: boolean; botId?: string; error?: string }> {
  // Get task details
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (taskError || !task) {
    return { success: false, error: 'Task not found' }
  }

  if (task.status !== 'pending') {
    return { success: false, error: 'Task is not pending' }
  }

  // Find matches
  const requirements: TaskRequirements = task.requirements || {}
  const matches = await findMatchingBots(taskId, requirements, task.max_budget, 1)

  if (matches.length === 0) {
    return { success: false, error: 'No matching bots available' }
  }

  const bestMatch = matches[0]

  // Assign the task
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      assigned_bot_id: bestMatch.bot.id,
      status: 'assigned',
      cost: bestMatch.bot.per_task_rate,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)

  if (updateError) {
    return { success: false, error: 'Failed to assign task' }
  }

  // Update bot status to busy
  await supabase
    .from('bots')
    .update({ status: 'busy', updated_at: new Date().toISOString() })
    .eq('id', bestMatch.bot.id)

  return { success: true, botId: bestMatch.bot.id }
}

/**
 * Get match suggestions for a task (without auto-assigning)
 */
export async function getMatchSuggestions(
  requirements: TaskRequirements,
  maxBudget: number,
  limit: number = 5
): Promise<MatchResult[]> {
  return findMatchingBots('preview', requirements, maxBudget, limit)
}
