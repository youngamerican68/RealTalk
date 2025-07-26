export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await getUserData(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    const resetDate = new Date(user.usageResetDate);
    
    let currentUsage = user.usageCount || 0;
    
    if (now > resetDate) {
      currentUsage = 0;
      await resetUserUsage(userId);
    }

    const limit = user.subscriptionStatus === 'pro' ? 1000 : 20;
    const remaining = Math.max(0, limit - currentUsage);

    return res.status(200).json({
      status: user.subscriptionStatus || 'free',
      usage: currentUsage,
      limit: limit,
      remaining: remaining,
      resetDate: resetDate.toISOString(),
      canUse: remaining > 0
    });

  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({ error: 'Failed to check subscription status' });
  }
}

async function getUserData(userId) {
  try {
    if (process.env.DATABASE_URL) {
      return await getUserFromDatabase(userId);
    } else {
      return await getUserFromStorage(userId);
    }
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
}

async function getUserFromDatabase(userId) {
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    
    const result = await client.query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      const newUser = await createUser(client, userId);
      return newUser;
    }
    
    return result.rows[0];
    
  } finally {
    await client.end();
  }
}

async function createUser(client, userId) {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  const result = await client.query(`
    INSERT INTO users (user_id, usage_count, usage_reset_date, subscription_status, created_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [userId, 0, nextMonth, 'free', now]);
  
  return result.rows[0];
}

async function resetUserUsage(userId) {
  if (process.env.DATABASE_URL) {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    
    try {
      await client.connect();
      
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      await client.query(`
        UPDATE users 
        SET usage_count = 0, usage_reset_date = $1
        WHERE user_id = $2
      `, [nextMonth, userId]);
      
    } finally {
      await client.end();
    }
  }
}

async function getUserFromStorage(userId) {
  const storage = global.userStorage || {};
  
  if (!storage[userId]) {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    storage[userId] = {
      user_id: userId,
      usage_count: 0,
      usage_reset_date: nextMonth.toISOString(),
      subscription_status: 'free',
      created_at: now.toISOString()
    };
    
    global.userStorage = storage;
  }
  
  return storage[userId];
}