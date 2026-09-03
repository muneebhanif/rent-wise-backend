const mongoose = require("mongoose");

const ListingReviewSchema = new mongoose.Schema({
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
    rating: { type: Number, min: 1, max: 5, required: true }, 
    comment: { type: String, required: true }, 
    createdAt: { type: Date, default: Date.now },
  });
  
  const ListingReview = mongoose.model("ListingReview", ListingReviewSchema);
  module.exports = ListingReview;
  