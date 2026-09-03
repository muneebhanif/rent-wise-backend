const webPush = require("web-push");

const VAPID_KEYS = {
  publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
  privateKey: process.env.WEB_PUSH_PRIVATE_KEY,
};

webPush.setVapidDetails(
  "mailto:alishahids189@gmail.com",
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);

const sendWebPush = async (subscription, payload , next) => {
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    next(error)
  }
};

// Export the function
module.exports = sendWebPush;