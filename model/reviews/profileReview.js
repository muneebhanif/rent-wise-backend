const mongoose = require("mongoose");

const ProfileReviewSchema = new mongoose.Schema({
  reviewedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  rating: { type: Number, min: 1, max: 5, required: true }, 
  sentiment:{type: String, enum: ["positive", "negative", "neutral"], default: "neutral"},
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ProfileReview = mongoose.model("ProfileReview", ProfileReviewSchema);
module.exports = ProfileReview;
