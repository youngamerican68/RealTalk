const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

export default async function handler(req, res) {
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
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
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

async function handleCheckoutCompleted(session) {
  const userId = session.metadata?.userId;
  
  if (!userId) {
    console.error('No user ID in checkout session metadata');
    return;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    
    await updateUserSubscription(userId, {
      status: 'pro',
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      subscriptionStart: new Date(subscription.current_period_start * 1000),
      subscriptionEnd: new Date(subscription.current_period_end * 1000)
    });
    
    console.log(`User ${userId} checkout completed - upgraded to pro`);
  } catch (error) {
    console.error('Failed to handle checkout completion:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  if (invoice.billing_reason === 'subscription_cycle') {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata?.userId;
    
    if (userId) {
      await updateUserSubscription(userId, {
        subscriptionEnd: new Date(subscription.current_period_end * 1000),
        lastPayment: new Date(invoice.created * 1000)
      });
      
      console.log(`User ${userId} subscription renewed`);
    }
  }
}

async function handleSubscriptionCreated(subscription) {
  const userId = subscription.metadata?.userId;
  
  if (userId) {
    await updateUserSubscription(userId, {
      status: 'pro',
      stripeSubscriptionId: subscription.id,
      subscriptionStart: new Date(subscription.current_period_start * 1000),
      subscriptionEnd: new Date(subscription.current_period_end * 1000)
    });
    
    console.log(`User ${userId} subscription created`);
  }
}

async function handleSubscriptionUpdated(subscription) {
  const userId = subscription.metadata?.userId;
  
  if (userId) {
    let status = 'pro';
    
    if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
      status = 'free';
    } else if (subscription.status === 'past_due') {
      status = 'past_due';
    }
    
    await updateUserSubscription(userId, {
      status: status,
      subscriptionEnd: new Date(subscription.current_period_end * 1000),
      subscriptionStatus: subscription.status
    });
    
    console.log(`User ${userId} subscription updated - status: ${status}`);
  }
}

async function handleSubscriptionDeleted(subscription) {
  const userId = subscription.metadata?.userId;
  
  if (userId) {
    await updateUserSubscription(userId, {
      status: 'free',
      stripeSubscriptionId: null,
      subscriptionEnd: new Date()
    });
    
    console.log(`User ${userId} subscription deleted`);
  }
}

async function handlePaymentFailed(invoice) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const userId = subscription.metadata?.userId;
  
  if (userId) {
    await updateUserSubscription(userId, {
      status: 'past_due',
      lastFailedPayment: new Date(invoice.created * 1000)
    });
    
    console.log(`User ${userId} payment failed`);
  }
}

async function updateUserSubscription(userId, updates) {
  if (process.env.DATABASE_URL) {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    
    try {
      await client.connect();
      
      const setClause = Object.keys(updates)
        .map((key, index) => `${camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const values = [userId, ...Object.values(updates)];
      
      await client.query(`
        UPDATE users 
        SET ${setClause}, updated_at = NOW()
        WHERE user_id = $1
      `, values);
      
    } finally {
      await client.end();
    }
  } else {
    const storage = global.userStorage || {};
    if (storage[userId]) {
      Object.assign(storage[userId], updates);
      storage[userId].updated_at = new Date().toISOString();
    }
    global.userStorage = storage;
  }
}

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}