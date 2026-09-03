const mongoose = require("mongoose");

const BlockchainAgreementSchema = new mongoose.Schema({
    agreementId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Aggrement",
        required: true,
        index: true
    },
    blockchainStatus: {
        type: String,
        enum: ["pending", "accepted", "rejected", "active"],
        required: true,
        default: "pending",
        index: true
    },
    transactionHash: {
        type: String,
        required: true,
        index: true
    }
}, {
    timestamps: true
});

const BlockchainAgreement = mongoose.model("BlockchainAgreement", BlockchainAgreementSchema);
module.exports = BlockchainAgreement;
