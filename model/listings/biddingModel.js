const mongoose = require("mongoose");

const BiddingSchema = new mongoose.Schema({
    rentalItem: { type: mongoose.Schema.Types.ObjectId, ref: "RentalItem", required: true },
    enabled: { type: Boolean, default: false },
    minimumBid: { type: Number,  },
    bidIncrement: { type: Number, default: 1 },
    bidEndDate: { type: Date,  },
    bids: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            bidAmount: { type: Number, required: true },
            bidDate: { type: Date, default: Date.now },
        },
    ],
    highestBid: { type: Number, default: 0 },
    highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

});


const bidding = mongoose.model("Bidding", BiddingSchema);
module.exports = bidding