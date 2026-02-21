/**
 * Hive Webhook Delivery System
 * 
 * Sends task notifications to bots via their registered webhook URLs
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export interface WebhookPayload {
  event: 'task.assigned' | 'task.cancelled' | 'task.deadline_warning'
  timestamp: string
  task: {
    id: string
    title: string
    description: string
    requirements: Record<string, any>
    max_budget: number
    deadline?: string
    renter_id: string
  }
}

export interface WebhookDeliveryResult {
  success: boolean
  statusCode?: number
  response?: any
  error?: string
  retryable: boolean
}

/**
 * Generate webhook signature for verification
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

/**
 * Send webhook to a bot
 */
export async function sendWebhook(
  botId: string,
  payload: WebhookPayload,
  retryCount: number = 0
): Promise<WebhookDeliveryResult> {
  const MAX_RETRIES = 3
  const RETRY_DELAYS = [1000, 5000, 30000] // 1s, 5s, 30s

  try {
    // Get bot webhook URL and auth token
    const { data: bot, error } = await supabase
      .from('bots')
      .select('webhook_url, auth_token_hash, name')
      .eq('id', botId)
      .single()

    if (error || !bot) {
      return { 
        success: false, 
        error: 'Bot not found', 
        retryable: false 
      }
    }

    const payloadString = JSON.stringify(payload)
    const signature = generateSignature(payloadString, bot.auth_token_hash)
    const timestamp = Date.now().toString()

    // Send the webhook
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

    const response = await fetch(bot.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hive-Signature': signature,
        'X-Hive-Timestamp': timestamp,
        'X-Hive-Event': payload.event,
        'User-Agent': 'Hive-Webhook/1.0'
      },
      body: payloadString,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    const responseText = await response.text()
    let responseBody: any
    try {
      responseBody = JSON.parse(responseText)
    } catch {
      responseBody = responseText
    }

    if (response.ok) {
      // Log successful delivery
      await logWebhookDelivery(botId, payload.event, payload.task.id, 'success', response.status)
      
      return {
        success: true,
        statusCode: response.status,
        response: responseBody,
        retryable: false
      }
    } else {
      // Determine if retryable
      const retryable = response.status >= 500 || response.status === 429
      
      if (retryable && retryCount < MAX_RETRIES) {
        // Schedule retry
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]))
        return sendWebhook(botId, payload, retryCount + 1)
      }

      await logWebhookDelivery(botId, payload.event, payload.task.id, 'failed', response.status)

      return {
        success: false,
        statusCode: response.status,
        response: responseBody,
        error: `Webhook returned ${response.status}`,
        retryable
      }
    }
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError'
    const retryable = isTimeout || err.code === 'ECONNREFUSED'

    if (retryable && retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]))
      return sendWebhook(botId, payload, retryCount + 1)
    }

    await logWebhookDelivery(botId, payload.event, '', 'error', 0, err.message)

    return {
      success: false,
      error: err.message || 'Network error',
      retryable
    }
  }
}

/**
 * Log webhook delivery attempt
 */
async function logWebhookDelivery(
  botId: string,
  event: string,
  taskId: string,
  status: 'success' | 'failed' | 'error',
  statusCode: number,
  errorMessage?: string
) {
  // In production, you'd want a webhook_logs table
  console.log(`[Webhook] ${event} to bot ${botId}: ${status} (${statusCode})`, 
    errorMessage ? `Error: ${errorMessage}` : '')
}

/**
 * Send task assignment notification to a bot
 */
export async function notifyBotOfAssignment(taskId: string, botId: string): Promise<WebhookDeliveryResult> {
  // Get task details
  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (error || !task) {
    return { success: false, error: 'Task not found', retryable: false }
  }

  const payload: WebhookPayload = {
    event: 'task.assigned',
    timestamp: new Date().toISOString(),
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      requirements: task.requirements || {},
      max_budget: task.max_budget,
      deadline: task.deadline,
      renter_id: task.renter_id
    }
  }

  return sendWebhook(botId, payload)
}

/**
 * Notify bot that a task was cancelled
 */
export async function notifyBotOfCancellation(taskId: string, botId: string): Promise<WebhookDeliveryResult> {
  const { data: task, error } = await supabase
    .from('tasks')
    .select('id, title, description, requirements, max_budget, renter_id')
    .eq('id', taskId)
    .single()

  if (error || !task) {
    return { success: false, error: 'Task not found', retryable: false }
  }

  const payload: WebhookPayload = {
    event: 'task.cancelled',
    timestamp: new Date().toISOString(),
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      requirements: task.requirements || {},
      max_budget: task.max_budget,
      renter_id: task.renter_id
    }
  }

  return sendWebhook(botId, payload)
}

/**
 * Send deadline warning to bot
 */
export async function notifyBotOfDeadline(taskId: string, botId: string): Promise<WebhookDeliveryResult> {
  const { data: task, error } = await supabase
    .from('tasks')
    .select('id, title, description, requirements, max_budget, deadline, renter_id')
    .eq('id', taskId)
    .single()

  if (error || !task) {
    return { success: false, error: 'Task not found', retryable: false }
  }

  const payload: WebhookPayload = {
    event: 'task.deadline_warning',
    timestamp: new Date().toISOString(),
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      requirements: task.requirements || {},
      max_budget: task.max_budget,
      deadline: task.deadline,
      renter_id: task.renter_id
    }
  }

  return sendWebhook(botId, payload)
}
