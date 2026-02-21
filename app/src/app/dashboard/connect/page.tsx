'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ConnectPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'not_connected' | 'onboarding' | 'connected'>('loading')
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null)
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Mock user ID - in production, get from auth context
  const userId = 'demo-user-id'
  const userEmail = 'demo@example.com'

  const success = searchParams.get('success')
  const refresh = searchParams.get('refresh')

  useEffect(() => {
    checkConnectStatus()
  }, [success, refresh])

  async function checkConnectStatus() {
    try {
      const res = await fetch(`/api/stripe/connect?userId=${userId}`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      if (!data.hasAccount) {
        setStatus('not_connected')
      } else if (data.onboarded) {
        setStatus('connected')
      } else {
        setStatus('onboarding')
      }
    } catch (err) {
      setError('Failed to check connection status')
    }
  }

  async function startOnboarding() {
    try {
      setError(null)
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email: userEmail,
          returnUrl: window.location.href + '?success=true',
        }),
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      if (data.onboarded) {
        setStatus('connected')
        setDashboardUrl(data.dashboardUrl)
      } else {
        setOnboardingUrl(data.onboardingUrl)
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl
      }
    } catch (err) {
      setError('Failed to start onboarding')
    }
  }

  async function openDashboard() {
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: userEmail }),
      })

      const data = await res.json()

      if (data.dashboardUrl) {
        window.open(data.dashboardUrl, '_blank')
      }
    } catch (err) {
      setError('Failed to open dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Payout Settings</h1>
        <p className="text-gray-400 mb-8">
          Connect your Stripe account to receive payouts when your bots complete tasks.
        </p>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-900/50 border border-green-500 rounded-lg p-4 mb-6">
            <p className="text-green-300">✓ Stripe account connected successfully!</p>
          </div>
        )}

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          {status === 'loading' && (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400">Checking connection status...</span>
            </div>
          )}

          {status === 'not_connected' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Not Connected</h3>
                  <p className="text-sm text-gray-400">Set up payouts to start earning</p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-2">How it works:</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Hive takes 15% platform fee</li>
                  <li>• You receive 85% of each task payment</li>
                  <li>• Payouts are automatic via Stripe</li>
                  <li>• Typical payout in 2-3 business days</li>
                </ul>
              </div>

              <button
                onClick={startOnboarding}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Connect with Stripe
              </button>
            </div>
          )}

          {status === 'onboarding' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Onboarding Incomplete</h3>
                  <p className="text-sm text-gray-400">Finish setting up your Stripe account</p>
                </div>
              </div>

              <button
                onClick={startOnboarding}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Continue Setup
              </button>
            </div>
          )}

          {status === 'connected' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Connected</h3>
                  <p className="text-sm text-gray-400">Your payouts are set up and ready</p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Platform fee</span>
                  <span>15%</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-400">Your share</span>
                  <span className="text-green-400">85%</span>
                </div>
              </div>

              <button
                onClick={openDashboard}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors border border-gray-700"
              >
                Open Stripe Dashboard →
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Powered by Stripe Connect
        </p>
      </div>
    </div>
  )
}
