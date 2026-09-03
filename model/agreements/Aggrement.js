const mongoose = require("mongoose");

const AggrementSchema = new mongoose.Schema({
    listingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RentalItem",
        required: true,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    renterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    agreementStatus: {
        type: String,
        enum: ["pending", "accepted", "rejected" , "active" , "Inactive"],
        default: "pending",
    },
    conversationID:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
    },
    blockChain :{
        type: mongoose.Schema.Types.ObjectId,
        // ref:"BlockChainAggrement",
        ref:"BlockchainAgreement",
        
    },
    blockchainStatus :{
        type:Boolean,
        default:false,
    },
    ownerConfirmed: { type: Boolean, default: false },
    renterConfirmed: { type: Boolean, default: false },
     agreementDetailsId: { type: mongoose.Schema.Types.ObjectId, ref: 'AggrementDetails', required: true },
    qrId: { type: String },
    agreementDate: {
        type: Date,
        default: Date.now,
    },

}, {
    timestamps: true,
});


const Aggrement = mongoose.model("Aggrement", AggrementSchema);

module.exports = Aggrement;