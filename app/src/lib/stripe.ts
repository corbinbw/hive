import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
})

// Platform fee: 15%
export const PLATFORM_FEE_PERCENT = 15

/**
 * Create a Stripe Connect account for a bot owner
 */
export async function createConnectAccount(email: string, userId: string) {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    metadata: {
      hive_user_id: userId,
    },
    capabilities: {
      transfers: { requested: true },
    },
  })

  return account
}

/**
 * Generate onboarding link for Connect account
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })

  return accountLink
}

/**
 * Check if a Connect account is fully onboarded
 */
export async function isAccountOnboarded(accountId: string): Promise<boolean> {
  const account = await stripe.accounts.retrieve(accountId)
  return account.details_submitted && account.charges_enabled
}

/**
 * Create a Stripe Customer for a task renter
 */
export async function createCustomer(email: string, userId: string) {
  const customer = await stripe.customers.create({
    email,
    metadata: {
      hive_user_id: userId,
    },
  })

  return customer
}

/**
 * Create a PaymentIntent with automatic transfer to bot owner
 * Uses Stripe Connect destination charges
 */
export async function createTaskPayment(params: {
  amountCents: number
  customerId: string
  botOwnerStripeAccountId: string
  taskId: string
  description: string
}) {
  const { amountCents, customerId, botOwnerStripeAccountId, taskId, description } = params

  // Calculate split: 15% platform, 85% to bot owner
  const platformFeeCents = Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100))
  const ownerPayoutCents = amountCents - platformFeeCents

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: customerId,
    description,
    metadata: {
      task_id: taskId,
      platform_fee: platformFeeCents.toString(),
      owner_payout: ownerPayoutCents.toString(),
    },
    // Destination charge: funds go to connected account minus application_fee
    transfer_data: {
      destination: botOwnerStripeAccountId,
    },
    application_fee_amount: platformFeeCents,
    // Capture manually after task completion
    capture_method: 'manual',
  })

  return {
    paymentIntent,
    platformFee: platformFeeCents,
    ownerPayout: ownerPayoutCents,
  }
}

/**
 * Capture a previously authorized PaymentIntent (task completed)
 */
export async function capturePayment(paymentIntentId: string) {
  const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId)
  return paymentIntent
}

/**
 * Cancel/refund a PaymentIntent (task failed or cancelled)
 */
export async function cancelPayment(paymentIntentId: string) {
  const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId)
  return paymentIntent
}

/**
 * Create a refund for a completed payment
 */
export async function refundPayment(paymentIntentId: string, reason?: string) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: 'requested_by_customer',
    metadata: {
      hive_reason: reason || 'Task dispute',
    },
  })
  return refund
}

/**
 * Get dashboard login link for Connect account
 */
export async function getConnectDashboardLink(accountId: string) {
  const loginLink = await stripe.accounts.createLoginLink(accountId)
  return loginLink
}

/**
 * Retrieve Connect account details
 */
export async function getConnectAccount(accountId: string) {
  return stripe.accounts.retrieve(accountId)
}
