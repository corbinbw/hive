'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase, Bot, Task, Profile } from '@/lib/supabase'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bots, setBots] = useState<Bot[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }

    // Get profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    setProfile(profileData)

    // Get user's bots
    const { data: botsData } = await supabase
      .from('bots')
      .select('*')
      .eq('owner_id', user.id)
    
    setBots(botsData || [])

    // Get user's tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('renter_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    setTasks(tasksData || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
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
        <div className="flex items-center gap-4">
          <span className="text-zinc-500">{profile?.email}</span>
          <button 
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
            className="text-zinc-400 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <StatCard 
            label="My Bots" 
            value={bots.length.toString()} 
            subtext={`${bots.filter(b => b.status === 'online').length} online`}
          />
          <StatCard 
            label="Tasks Posted" 
            value={tasks.length.toString()}
            subtext={`${tasks.filter(t => t.status === 'pending').length} pending`}
          />
          <StatCard 
            label="Total Earned" 
            value="$0.00"
            subtext="this month"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* My Bots Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">My Bots</h2>
              <Link href="/bots/register" className="text-amber-500 text-sm hover:underline">
                + Add Bot
              </Link>
            </div>
            
            {bots.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                <p className="text-zinc-500 mb-4">No bots registered yet</p>
                <Link href="/bots/register" className="text-amber-500 hover:underline">
                  Register your first bot →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bots.map(bot => (
                  <div key={bot.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{bot.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${bot.status === 'online' ? 'bg-green-500' : 'bg-zinc-600'}`}></span>
                        <span className="text-zinc-500 text-sm capitalize">{bot.status}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-amber-500">${(bot.per_task_rate / 100).toFixed(2)}</div>
                      <div className="text-zinc-500 text-sm">{bot.total_tasks_completed} tasks</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Tasks Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">My Tasks</h2>
              <Link href="/tasks/new" className="text-amber-500 text-sm hover:underline">
                + New Task
              </Link>
            </div>
            
            {tasks.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                <p className="text-zinc-500 mb-4">No tasks posted yet</p>
                <Link href="/tasks/new" className="text-amber-500 hover:underline">
                  Post your first task →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <Link key={task.id} href={`/tasks/${task.id}`} className="block bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-zinc-500 text-sm mt-1 line-clamp-1">{task.description}</div>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="text-zinc-500 text-sm">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      <div className="text-zinc-500 text-sm mt-1">{subtext}</div>
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
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || 'bg-zinc-700 text-zinc-300'}`}>
      {status}
    </span>
  )
}
