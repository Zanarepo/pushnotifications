const express = require("express");
const webPush = require("web-push");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json());

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


// Set VAPID details
webPush.setVapidDetails(
  "mailto:pzana.fred@gmail.com",
  "BFTTHTZpo52AJnRcC1Xc39U8YZFNTVsTLLmPrqrMiXFZDwT1EwQjFTos5v5TYEsONu5VwuT6R1CovI1iM62-Eak",
  "daiMNsj8UKOx0uSJlPNEUR30r6XAWH-xnHPiDlrvX5s"
);

// Middleware to check API key
const authenticate = (req, res, next) => {
  const providedApiKey = req.headers["x-api-key"];
  if (!providedApiKey || providedApiKey !== apiKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Endpoint to send notifications
app.post("/send-push-notification", authenticate, async (req, res) => {
  const { title, message } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required" });
  }

  try {
    // Fetch subscriptions from Supabase
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, subscription");

    if (error) {
      throw new Error("Failed to fetch subscriptions: " + error.message);
    }

    // Send notifications concurrently
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          JSON.parse(sub.subscription),
          JSON.stringify({ title, message })
        );
      } catch (err) {
        console.error(`Error sending notification to subscription ${sub.id}:`, err);
        // Remove expired or invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          console.log(`Removed expired subscription ${sub.id}`);
        }
      }
    });

    await Promise.all(sendPromises);

    res.status(200).json({ message: "Notifications sent" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});