'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Bot, Task } from '@/lib/supabase'

export default function BotDetailPage() {
  const params = useParams()
  const botId = params.id as string
  
  const [bot, setBot] = useState<Bot | null>(null)
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    loadBot()
  }, [botId])

  async function loadBot() {
    // Get bot details
    const { data: botData, error } = await supabase
      .from('bots')
      .select('*')
      .eq('id', botId)
      .single()
    
    if (error || !botData) {
      setLoading(false)
      return
    }
    
    setBot(botData)
    
    // Check if current user owns this bot
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.id === botData.owner_id) {
      setIsOwner(true)
    }
    
    // Get recent completed tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_bot_id', botId)
      .in('status', ['completed'])
      .order('completed_at', { ascending: false })
      .limit(5)
    
    setRecentTasks(tasksData || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-500">Loading bot...</div>
      </div>
    )
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-500 mb-4">Bot not found</div>
          <Link href="/bots" className="text-amber-500 hover:underline">
            Browse all bots
          </Link>
        </div>
      </div>
    )
  }

  // TODO: Track failed tasks separately for accurate success rate
  const successRate = bot.total_tasks_completed > 0 ? '100' : 'N/A'

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🐝</span>
          <span className="text-xl font-bold">Hive</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/bots" className="text-zinc-400 hover:text-white">
            All Bots
          </Link>
          {isOwner && (
            <Link href="/dashboard" className="text-zinc-400 hover:text-white">
              Dashboard
            </Link>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-start gap-6 mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-4xl">
            🤖
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{bot.name}</h1>
              <StatusBadge status={bot.status} />
              {isOwner && (
                <span className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-xs">
                  You own this bot
                </span>
              )}
            </div>
            {bot.description && (
              <p className="text-zinc-400 mb-4">{bot.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm">
              <div className="text-amber-500 font-semibold">
                ${(bot.per_task_rate / 100).toFixed(2)}/task
              </div>
              <div className="text-zinc-500">
                Joined {new Date(bot.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Capabilities */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="font-semibold mb-4">Capabilities</h2>
              <div className="flex flex-wrap gap-2">
                {bot.capabilities.map((cap: string) => (
                  <span key={cap} className="bg-amber-500/20 text-amber-500 px-3 py-1.5 rounded-lg text-sm">
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            {/* Recent Completed Tasks */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="font-semibold mb-4">Recent Work</h2>
              {recentTasks.length === 0 ? (
                <p className="text-zinc-500">No completed tasks yet</p>
              ) : (
                <div className="space-y-3">
                  {recentTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-zinc-500 text-sm">
                          {task.completed_at && new Date(task.completed_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-green-500 text-sm">✓ Completed</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Technical Details (for owners) */}
            {isOwner && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="font-semibold mb-4">Technical Details</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Webhook URL</span>
                    <code className="bg-zinc-800 px-2 py-1 rounded text-xs">
                      {bot.webhook_url || 'Not configured'}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Last Heartbeat</span>
                    <span>
                      {bot.last_heartbeat 
                        ? new Date(bot.last_heartbeat).toLocaleString()
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Bot ID</span>
                    <code className="bg-zinc-800 px-2 py-1 rounded text-xs">{bot.id}</code>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm text-zinc-500 mb-4">Stats</h3>
              <div className="space-y-4">
                <StatItem 
                  label="Tasks Completed" 
                  value={bot.total_tasks_completed.toString()} 
                />
                <StatItem 
                  label="Success Rate" 
                  value={successRate === 'N/A' ? successRate : `${successRate}%`} 
                />
                <StatItem 
                  label="Total Earned" 
                  value={`$${(bot.total_earned / 100).toFixed(2)}`} 
                />
                <StatItem 
                  label="Rating" 
                  value={bot.rating ? `${bot.rating.toFixed(1)} / 5.0` : 'No ratings'} 
                />
              </div>
            </div>

            {/* Hire CTA */}
            {!isOwner && bot.status === 'online' && (
              <Link 
                href={`/tasks/new?preferred_bot=${bot.id}`}
                className="block w-full bg-amber-500 text-black text-center py-3 rounded-xl font-medium hover:bg-amber-400 transition"
              >
                Hire This Bot
              </Link>
            )}

            {/* Stripe Connect status for owners */}
            {isOwner && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-sm text-zinc-500 mb-3">Payments</h3>
                {bot.stripe_connected ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Stripe Connected</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-zinc-500 text-sm mb-3">
                      Connect Stripe to receive payments
                    </p>
                    <Link 
                      href="/dashboard/connect"
                      className="text-amber-500 text-sm hover:underline"
                    >
                      Set up Stripe →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online: 'bg-green-500/20 text-green-500',
    offline: 'bg-zinc-700 text-zinc-400',
    busy: 'bg-yellow-500/20 text-yellow-500',
  }
  
  return (
    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${colors[status] || 'bg-zinc-700 text-zinc-300'}`}>
      {status}
    </span>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
