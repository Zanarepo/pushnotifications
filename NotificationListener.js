const { Client } = require('pg');
const axios = require('axios');
require('dotenv').config();

// PostgreSQL client configuration
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for hosted databases like Render
});

// Connect to PostgreSQL
pgClient.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Connection error:', err.stack));

// Listen for notifications
pgClient.query('LISTEN new_sale_channel');

pgClient.on('notification', async (msg) => {
  try {
    const payload = JSON.parse(msg.payload);
    console.log('New sale received:', payload);

    // Send push notification
    await axios.post(
      'https://pushnotifications-1.onrender.com/send-push-notification',
      {
        title: `New Sale Recorded (ID: ${payload.id})`,
        message: `A sale of ${payload.quantity} item(s) for $${payload.amount} was recorded via ${payload.payment_method}.`
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.API_KEY // Your API key from .env
        }
      }
    );
    console.log('Push notification sent successfully');
  } catch (error) {
    console.error('Error sending push notification:', error.response ? error.response.data : error.message);
  }
});

// Handle errors
pgClient.on('error', (err) => {
  console.error('PostgreSQL client error:', err.stack);
});