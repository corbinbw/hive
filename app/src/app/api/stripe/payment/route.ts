import { NextRequest, NextResponse } from 'next/server'
import { createTaskPayment, createCustomer, capturePayment, cancelPayment } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/stripe/payment
 * Create a payment authorization for a task
 */
export async function POST(request: NextRequest) {
  try {
    const { taskId, renterId } = await request.json()

    if (!taskId || !renterId) {
      return NextResponse.json(
        { error: 'Missing taskId or renterId' },
        { status: 400 }
      )
    }

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*, assigned_bot_id')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    if (!task.assigned_bot_id) {
      return NextResponse.json(
        { error: 'Task has no assigned bot' },
        { status: 400 }
      )
    }

    // Get bot owner's Stripe account
    const { data: bot } = await supabase
      .from('bots')
      .select('owner_id, name')
      .eq('id', task.assigned_bot_id)
      .single()

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      )
    }

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', bot.owner_id)
      .single()

    if (!ownerProfile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'Bot owner has not set up payouts' },
        { status: 400 }
      )
    }

    // Get or create renter's Stripe customer
    const { data: renterProfile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', renterId)
      .single()

    let customerId = renterProfile?.stripe_customer_id

    if (!customerId && renterProfile?.email) {
      const customer = await createCustomer(renterProfile.email, renterId)
      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', renterId)
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'Could not create customer' },
        { status: 500 }
      )
    }

    // Create payment authorization
    const { paymentIntent, platformFee, ownerPayout } = await createTaskPayment({
      amountCents: task.max_budget,
      customerId,
      botOwnerStripeAccountId: ownerProfile.stripe_account_id,
      taskId,
      description: `Hive Task: ${task.title} (Bot: ${bot.name})`,
    })

    // Create transaction record
    await supabase.from('transactions').insert({
      task_id: taskId,
      renter_id: renterId,
      owner_id: bot.owner_id,
      amount: task.max_budget,
      platform_fee: platformFee,
      owner_payout: ownerPayout,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'pending',
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: task.max_budget,
      platformFee,
      ownerPayout,
    })
  } catch (error) {
    console.error('Payment creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/stripe/payment
 * Capture or cancel a payment
 */
export async function PATCH(request: NextRequest) {
  try {
    const { paymentIntentId, action } = await request.json()

    if (!paymentIntentId || !action) {
      return NextResponse.json(
        { error: 'Missing paymentIntentId or action' },
        { status: 400 }
      )
    }

    let status: string
    let paymentIntent

    if (action === 'capture') {
      paymentIntent = await capturePayment(paymentIntentId)
      status = 'completed'
    } else if (action === 'cancel') {
      paymentIntent = await cancelPayment(paymentIntentId)
      status = 'refunded'
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "capture" or "cancel"' },
        { status: 400 }
      )
    }

    // Update transaction status
    await supabase
      .from('transactions')
      .update({ status })
      .eq('stripe_payment_intent_id', paymentIntentId)

    return NextResponse.json({
      success: true,
      status,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
      },
    })
  } catch (error) {
    console.error('Payment update error:', error)
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    )
  }
}
