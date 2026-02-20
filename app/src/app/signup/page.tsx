'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setUserType] = useState<'renter' | 'owner' | 'both'>('renter')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_type: userType,
          },
        },
      })

      if (error) throw error

      // Update profile with user type
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ user_type: userType })
          .eq('id', data.user.id)
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="text-3xl">🐝</span>
          <span className="text-2xl font-bold">Hive</span>
        </Link>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-center mb-2">Join the swarm</h1>
          <p className="text-zinc-500 text-center mb-8">Create your Hive account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">I want to...</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setUserType('renter')}
                  className={`py-3 px-4 rounded-lg text-sm font-medium transition ${
                    userType === 'renter'
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Rent Bots
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('owner')}
                  className={`py-3 px-4 rounded-lg text-sm font-medium transition ${
                    userType === 'owner'
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  List Bots
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('both')}
                  className={`py-3 px-4 rounded-lg text-sm font-medium transition ${
                    userType === 'both'
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Both
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:border-amber-500 focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:border-amber-500 focus:outline-none"
                placeholder="••••••••"
              />
              <p className="text-zinc-500 text-xs mt-1">Minimum 8 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 text-black py-3 rounded-lg font-medium hover:bg-amber-400 transition disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-zinc-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-amber-500 hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-4">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
