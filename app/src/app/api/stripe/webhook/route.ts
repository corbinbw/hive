import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentSucceeded(paymentIntent)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailed(paymentIntent)
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        await handleAccountUpdated(account)
        break
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer
        await handleTransferCreated(transfer)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const taskId = paymentIntent.metadata.task_id

  if (taskId) {
    // Update transaction status
    await supabase
      .from('transactions')
      .update({ status: 'authorized' })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    console.log(`Payment authorized for task ${taskId}`)
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const taskId = paymentIntent.metadata.task_id

  if (taskId) {
    // Update transaction status
    await supabase
      .from('transactions')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    // Mark task as failed
    await supabase
      .from('tasks')
      .update({ status: 'failed' })
      .eq('id', taskId)

    console.log(`Payment failed for task ${taskId}`)
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  const userId = account.metadata?.hive_user_id

  if (userId && account.details_submitted && account.charges_enabled) {
    // User completed onboarding
    console.log(`Connect account ${account.id} fully onboarded for user ${userId}`)
  }
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  // Update transaction with transfer ID
  const paymentIntentId = transfer.source_transaction

  if (paymentIntentId && typeof paymentIntentId === 'string') {
    await supabase
      .from('transactions')
      .update({ stripe_transfer_id: transfer.id })
      .eq('stripe_payment_intent_id', paymentIntentId)

    console.log(`Transfer ${transfer.id} created for payment ${paymentIntentId}`)
  }
}
