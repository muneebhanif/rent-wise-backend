const mongoose = require("mongoose");
const RentalSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  category: {
    type: String,
    enum: ["car", "hostel", "house"],
    required: true,
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  priceUnit: {
    type: String,
    enum: ["hour", "day", "week", "month"],
    required: true,
  },
  location: {
    type: mongoose.Schema.Types.ObjectId, ref: "Location",
    required: true 
  },
  amenities: [{ type: String }],
  rules: [{ type: String }],

  images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Image" }],
  videos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],

  // listingReview: [{
  //   reviewId: { type: mongoose.Schema.Types.ObjectId, ref: "ListingReview" , default:null},
  //   canReview: { type: Boolean, default: false }
  // }
  // ],

  bidding: { type: mongoose.Schema.Types.ObjectId, ref: "Bidding" , default: null},

  comment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },


  facilities: { type: mongoose.Schema.Types.ObjectId, ref: "facilties", default: null },

  listingStatus: {
    type: String,
    enum: ["active", "Inactive", "pending", "Rented"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

RentalSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const RentalItem = mongoose.model("RentalItem", RentalSchema);
module.exports = RentalItem;
