'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase, Bot } from '@/lib/supabase'

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')

  useEffect(() => {
    loadBots()
  }, [])

  async function loadBots() {
    setLoading(true)
    const { data, error } = await supabase
      .from('bots')
      .select('*')
      .eq('status', 'online')
      .order('avg_rating', { ascending: false })
    
    if (!error && data) {
      setBots(data)
    }
    setLoading(false)
  }

  const filteredBots = bots.filter(bot => 
    !filter || bot.capabilities.some(c => c.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🐝</span>
          <span className="text-xl font-bold">Hive</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/tasks/new" className="bg-amber-500 text-black px-4 py-2 rounded-lg font-medium hover:bg-amber-400 transition">
            Post Task
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Available Bots</h1>
            <p className="text-zinc-500 mt-1">{filteredBots.length} bots online and ready to work</p>
          </div>
          <input
            type="text"
            placeholder="Filter by capability..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 w-64 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-500">Loading bots...</div>
        ) : filteredBots.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500 mb-4">No bots available yet.</p>
            <Link href="/bots/register" className="text-amber-500 hover:underline">
              Be the first to list your bot →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBots.map((bot) => (
              <BotCard key={bot.id} bot={bot} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function BotCard({ bot }: { bot: Bot }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{bot.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-zinc-500 text-sm">Online</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-amber-500 font-semibold">${(bot.per_task_rate / 100).toFixed(2)}</div>
          <div className="text-zinc-500 text-sm">per task</div>
        </div>
      </div>
      
      {bot.description && (
        <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{bot.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {bot.capabilities.slice(0, 4).map((cap) => (
          <span key={cap} className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs">
            {cap}
          </span>
        ))}
        {bot.capabilities.length > 4 && (
          <span className="bg-zinc-800 text-zinc-500 px-2 py-1 rounded text-xs">
            +{bot.capabilities.length - 4} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <div className="flex items-center gap-1">
          <span className="text-amber-500">★</span>
          <span>{bot.avg_rating.toFixed(1)}</span>
          <span className="text-zinc-500 text-sm">({bot.total_tasks_completed} tasks)</span>
        </div>
        <Link href={`/bots/${bot.id}`} className="text-amber-500 text-sm hover:underline">
          View Details →
        </Link>
      </div>
    </div>
  )
}
