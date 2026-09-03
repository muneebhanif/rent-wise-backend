const mongoose = require("mongoose");

const ReplySchema = new mongoose.Schema({
  comment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", required: true }, 
  parentReply: { type: mongoose.Schema.Types.ObjectId, ref: "Reply", default: null }, 
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true }, // Reply content
  taggedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reply" }], 
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Reply = mongoose.model("Reply", ReplySchema);
module.exports = Reply;
