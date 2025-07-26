const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, plan = 'pro_monthly' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }

    const prices = {
      pro_monthly: process.env.STRIPE_PRICE_ID_MONTHLY || 'price_1234567890',
      pro_yearly: process.env.STRIPE_PRICE_ID_YEARLY || 'price_0987654321'
    };

    const priceId = prices[plan];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId,
        plan: plan
      },
      success_url: `${process.env.FRONTEND_URL || 'https://realtalk-draft.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://realtalk-draft.com'}/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_creation: 'always',
      subscription_data: {
        metadata: {
          userId: userId
        }
      }
    });

    return res.status(200).json({
      checkoutUrl: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Checkout creation error:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export async function handleWebhook(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleSuccessfulPayment(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleSuccessfulPayment(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleFailedPayment(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleSuccessfulPayment(session) {
  const userId = session.metadata?.userId;
  
  if (!userId) {
    console.error('No user ID in payment session metadata');
    return;
  }

  try {
    await updateUserSubscription(userId, 'pro');
    console.log(`User ${userId} upgraded to pro`);
  } catch (error) {
    console.error('Failed to update user subscription:', error);
  }
}

async function handleSubscriptionCancellation(subscription) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    console.error('No user ID in subscription metadata');
    return;
  }

  try {
    await updateUserSubscription(userId, 'free');
    console.log(`User ${userId} subscription cancelled`);
  } catch (error) {
    console.error('Failed to update user subscription:', error);
  }
}

async function handleFailedPayment(invoice) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    console.error('No user ID in failed payment');
    return;
  }

  try {
    await sendPaymentFailureNotification(userId);
    console.log(`Payment failure notification sent to user ${userId}`);
  } catch (error) {
    console.error('Failed to send payment failure notification:', error);
  }
}

async function updateUserSubscription(userId, status) {
  if (process.env.DATABASE_URL) {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    
    try {
      await client.connect();
      
      await client.query(`
        UPDATE users 
        SET subscription_status = $1, updated_at = $2
        WHERE user_id = $3
      `, [status, new Date(), userId]);
      
    } finally {
      await client.end();
    }
  } else {
    const storage = global.userStorage || {};
    if (storage[userId]) {
      storage[userId].subscription_status = status;
      storage[userId].updated_at = new Date().toISOString();
    }
    global.userStorage = storage;
  }
}

async function sendPaymentFailureNotification(userId) {
  console.log(`TODO: Send payment failure notification to user ${userId}`);
}