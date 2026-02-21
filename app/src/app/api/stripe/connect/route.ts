import { NextRequest, NextResponse } from 'next/server'
import { createConnectAccount, createAccountLink, isAccountOnboarded, getConnectDashboardLink } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/stripe/connect
 * Create a Stripe Connect account for a bot owner and return onboarding link
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, email, returnUrl } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      )
    }

    // Check if user already has a Connect account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    let accountId = profile?.stripe_account_id

    // Create new account if none exists
    if (!accountId) {
      const account = await createConnectAccount(email, userId)
      accountId = account.id

      // Save to database
      await supabase
        .from('profiles')
        .update({ 
          stripe_account_id: accountId,
          user_type: 'owner' // or 'both' if they were already a renter
        })
        .eq('id', userId)
    }

    // Check if already onboarded
    const onboarded = await isAccountOnboarded(accountId)
    
    if (onboarded) {
      // Return dashboard link instead
      const dashboardLink = await getConnectDashboardLink(accountId)
      return NextResponse.json({
        onboarded: true,
        dashboardUrl: dashboardLink.url,
      })
    }

    // Generate onboarding link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const accountLink = await createAccountLink(
      accountId,
      `${baseUrl}/dashboard/connect?refresh=true`,
      returnUrl || `${baseUrl}/dashboard/connect?success=true`
    )

    return NextResponse.json({
      onboarded: false,
      onboardingUrl: accountLink.url,
      accountId,
    })
  } catch (error) {
    console.error('Stripe Connect error:', error)
    return NextResponse.json(
      { error: 'Failed to create Connect account' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/stripe/connect?userId=xxx
 * Check Connect account status
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    if (!profile?.stripe_account_id) {
      return NextResponse.json({
        hasAccount: false,
        onboarded: false,
      })
    }

    const onboarded = await isAccountOnboarded(profile.stripe_account_id)

    return NextResponse.json({
      hasAccount: true,
      accountId: profile.stripe_account_id,
      onboarded,
    })
  } catch (error) {
    console.error('Stripe Connect status error:', error)
    return NextResponse.json(
      { error: 'Failed to check Connect status' },
      { status: 500 }
    )
  }
}
