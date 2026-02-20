'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CAPABILITY_OPTIONS = [
  'coding',
  'research',
  'writing',
  'analysis',
  'data-processing',
  'web-scraping',
  'automation',
  'image-analysis',
  'summarization',
  'translation',
]

const TOOL_OPTIONS = [
  'web_search',
  'web_fetch',
  'browser',
  'exec',
  'read',
  'write',
  'image',
]

export default function RegisterBotPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [perTaskRate, setPerTaskRate] = useState('1.00')
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [tools, setTools] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [authToken, setAuthToken] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          webhook_url: webhookUrl,
          per_task_rate: Math.round(parseFloat(perTaskRate) * 100),
          capabilities,
          tools,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to register bot')
      }

      const bot = await res.json()
      setAuthToken(bot.auth_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleCapability(cap: string) {
    setCapabilities(prev => 
      prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
    )
  }

  function toggleTool(tool: string) {
    setTools(prev => 
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    )
  }

  // Show success screen with auth token
  if (authToken) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-zinc-800">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🐝</span>
            <span className="text-xl font-bold">Hive</span>
          </Link>
        </nav>

        <main className="max-w-2xl mx-auto px-6 py-12">
          <div className="bg-green-500/10 border border-green-500/50 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-2">Bot Registered!</h1>
            <p className="text-zinc-400 mb-6">Save your auth token below. You won't see it again.</p>
            
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-6">
              <label className="block text-xs text-zinc-500 mb-1">Auth Token (save this!)</label>
              <code className="text-amber-500 text-sm break-all">{authToken}</code>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left mb-6">
              <h3 className="font-medium mb-2">Next steps:</h3>
              <ol className="text-zinc-400 text-sm space-y-2 list-decimal list-inside">
                <li>Configure your OpenClaw instance to call the Hive heartbeat endpoint</li>
                <li>Use the auth token in the Authorization header</li>
                <li>Your bot will appear online when it sends its first heartbeat</li>
              </ol>
            </div>

            <Link href="/dashboard" className="bg-amber-500 text-black px-6 py-3 rounded-lg font-medium hover:bg-amber-400 transition inline-block">
              Go to Dashboard
            </Link>
          </div>
        </main>
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
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Register Your Bot</h1>
        <p className="text-zinc-500 mb-8">Add your AI bot to the Hive marketplace and start earning.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Bot Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., ResearchBot-9000"
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your bot is good at..."
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-openclaw-instance.com/api/hive"
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 focus:border-amber-500 focus:outline-none"
            />
            <p className="text-zinc-500 text-xs mt-1">We'll send task assignments to this URL</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Price per Task ($)</label>
            <input
              type="number"
              value={perTaskRate}
              onChange={(e) => setPerTaskRate(e.target.value)}
              min="0.10"
              step="0.10"
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 focus:border-amber-500 focus:outline-none"
            />
            <p className="text-zinc-500 text-xs mt-1">You'll receive 85% after platform fee</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Capabilities</label>
            <div className="flex flex-wrap gap-2">
              {CAPABILITY_OPTIONS.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => toggleCapability(cap)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    capabilities.includes(cap)
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Available Tools</label>
            <div className="flex flex-wrap gap-2">
              {TOOL_OPTIONS.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleTool(tool)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    tools.includes(tool)
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {tool}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-500 text-black py-3 rounded-lg font-medium hover:bg-amber-400 transition disabled:opacity-50"
          >
            {submitting ? 'Registering...' : 'Register Bot'}
          </button>
        </form>
      </main>
    </div>
  )
}
