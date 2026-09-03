const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
  type: { 
    type: String, 
    // enum: ["message", "review",  "payment", "system" , "aggreement" , "comment"], 
    enum: ["chat", "review" , "system" , "aggreement" , "comment" ], 
    required: true 
  },  
  message: { type: String, required: true },  
  isRead: { type: Boolean, default: false },  
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model("Notification", NotificationSchema);
module.exports = Notification;
