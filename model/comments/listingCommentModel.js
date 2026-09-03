const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  rental: { type: mongoose.Schema.Types.ObjectId, ref: "RentalItem", required: true }, // Reference to rental item
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User who made the comment
  text: { type: String, required: true }, // Comment content
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null }, // For soft delete
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reply" }], // References to replies
});

const Comment = mongoose.model("Comment", CommentSchema);
module.exports = Comment;
