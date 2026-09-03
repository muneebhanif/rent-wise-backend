const mongoose = require("mongoose");

const UserSettingsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  notificationPreferences: {
    review: { type: Boolean, default: false },
    comment: { type: Boolean, default: false },
    system: { type: Boolean, default: false },
    chat: { type: Boolean, default: false },
    aggreement: { type: Boolean, default: false },  },
  webPushSubscription: {
    endpoint: { type: String },
    keys: {
      p256dh: { type: String },
      auth: { type: String },
    },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const UserSettings = mongoose.model("UserSettings", UserSettingsSchema);
module.exports = UserSettings;
