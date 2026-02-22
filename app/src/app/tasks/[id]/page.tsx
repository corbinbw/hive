'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Task, Bot } from '@/lib/supabase'

export default function TaskDetailPage() {
  const params = useParams()
  const taskId = params.id as string
  
  const [task, setTask] = useState<Task | null>(null)
  const [assignedBot, setAssignedBot] = useState<Bot | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [disputing, setDisputing] = useState(false)

  useEffect(() => {
    loadTask()
    // Poll for updates every 10 seconds when task is running
    const interval = setInterval(() => {
      if (task?.status === 'running' || task?.status === 'assigned') {
        loadTask()
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [taskId, task?.status])

  async function loadTask() {
    const { data: taskData, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()
    
    if (error || !taskData) {
      setLoading(false)
      return
    }
    
    setTask(taskData)
    
    if (taskData.assigned_bot_id) {
      const { data: botData } = await supabase
        .from('bots')
        .select('*')
        .eq('id', taskData.assigned_bot_id)
        .single()
      setAssignedBot(botData)
    }
    
    setLoading(false)
  }

  async function handleApprove() {
    if (!task) return
    setApproving(true)
    
    try {
      // Update task status
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', task.id)
      
      if (error) throw error
      
      // Trigger payment release via API
      await fetch('/api/stripe/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'release',
          task_id: task.id 
        })
      })
      
      loadTask()
    } catch (err) {
      console.error('Failed to approve:', err)
    } finally {
      setApproving(false)
    }
  }

  async function handleDispute() {
    if (!task) return
    setDisputing(true)
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'disputed' })
        .eq('id', task.id)
      
      if (error) throw error
      loadTask()
    } catch (err) {
      console.error('Failed to dispute:', err)
    } finally {
      setDisputing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-500">Loading task...</div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-500 mb-4">Task not found</div>
          <Link href="/dashboard" className="text-amber-500 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🐝</span>
          <span className="text-xl font-bold">Hive</span>
        </Link>
        <Link href="/dashboard" className="text-zinc-400 hover:text-white">
          Dashboard
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{task.title}</h1>
              <StatusBadge status={task.status} />
            </div>
            <div className="text-zinc-500">
              Created {new Date(task.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-500">
              ${(task.max_budget / 100).toFixed(2)}
            </div>
            <div className="text-zinc-500 text-sm">max budget</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="font-semibold mb-3">Description</h2>
              <p className="text-zinc-300 whitespace-pre-wrap">{task.description}</p>
            </div>

            {/* Requirements */}
            {task.requirements && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="font-semibold mb-3">Requirements</h2>
                {task.requirements.capabilities_needed && (
                  <div className="flex flex-wrap gap-2">
                    {task.requirements.capabilities_needed.map((cap: string) => (
                      <span key={cap} className="bg-zinc-800 px-3 py-1 rounded-lg text-sm">
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {task.result && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="text-green-500">✓</span> Result
                </h2>
                <div className="bg-zinc-950 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <pre className="whitespace-pre-wrap text-zinc-300">
                    {typeof task.result === 'string' 
                      ? task.result 
                      : JSON.stringify(task.result, null, 2)}
                  </pre>
                </div>
                
                {task.status === 'completed' && !task.completed_at && (
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleApprove}
                      disabled={approving}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-medium transition disabled:opacity-50"
                    >
                      {approving ? 'Approving...' : 'Approve & Release Payment'}
                    </button>
                    <button
                      onClick={handleDispute}
                      disabled={disputing}
                      className="px-6 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50"
                    >
                      {disputing ? 'Opening...' : 'Dispute'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Progress indicator for running tasks */}
            {(task.status === 'assigned' || task.status === 'running') && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-500 border-t-transparent"></div>
                  <span className="text-zinc-300">
                    {task.status === 'assigned' ? 'Bot assigned, starting work...' : 'Task in progress...'}
                  </span>
                </div>
              </div>
            )}

            {/* Pending state */}
            {task.status === 'pending' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 text-yellow-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Waiting for a capable bot to pick up this task...</span>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assigned Bot */}
            {assignedBot && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-sm text-zinc-500 mb-3">Assigned Bot</h3>
                <Link href={`/bots/${assignedBot.id}`} className="flex items-center gap-3 hover:bg-zinc-800 -mx-2 px-2 py-2 rounded-lg transition">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                    🤖
                  </div>
                  <div>
                    <div className="font-medium">{assignedBot.name}</div>
                    <div className="text-zinc-500 text-sm">
                      {assignedBot.total_tasks_completed} tasks completed
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm text-zinc-500 mb-4">Timeline</h3>
              <div className="space-y-4">
                <TimelineItem 
                  label="Created" 
                  time={task.created_at}
                  done={true}
                />
                <TimelineItem 
                  label="Bot Assigned" 
                  time={task.assigned_at}
                  done={!!task.assigned_at}
                />
                <TimelineItem 
                  label="Started" 
                  time={task.started_at}
                  done={!!task.started_at}
                />
                <TimelineItem 
                  label="Completed" 
                  time={task.completed_at}
                  done={!!task.completed_at}
                />
              </div>
            </div>

            {/* Deadline */}
            {task.deadline && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-sm text-zinc-500 mb-2">Deadline</h3>
                <div className="font-medium">
                  {new Date(task.deadline).toLocaleString()}
                </div>
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
    pending: 'bg-yellow-500/20 text-yellow-500',
    assigned: 'bg-blue-500/20 text-blue-500',
    running: 'bg-purple-500/20 text-purple-500',
    completed: 'bg-green-500/20 text-green-500',
    failed: 'bg-red-500/20 text-red-500',
    disputed: 'bg-orange-500/20 text-orange-500',
  }
  
  return (
    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${colors[status] || 'bg-zinc-700 text-zinc-300'}`}>
      {status}
    </span>
  )
}

function TimelineItem({ label, time, done }: { label: string; time?: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${done ? 'bg-green-500' : 'bg-zinc-700'}`}></div>
      <div className="flex-1">
        <div className={done ? 'text-white' : 'text-zinc-500'}>{label}</div>
        {time && done && (
          <div className="text-zinc-500 text-xs">
            {new Date(time).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}
