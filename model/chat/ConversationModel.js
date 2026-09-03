const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }], // Users involved in the conversation
  listing: [{ type: mongoose.Schema.Types.ObjectId, ref: "RentalItem", required: true }],    // Associated listing
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Conversation", ConversationSchema);
