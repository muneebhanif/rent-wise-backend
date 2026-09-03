const mongoose = require("mongoose");

const MesssageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    listing:[ { type: mongoose.Schema.Types.ObjectId, ref: 'RentalItem', required: true }],
    message: { type: mongoose.Schema.Types.Mixed, required: true }, 
    status: { type: String, enum: ['sent', 'read'], default: 'sent' },
    type: { type: String, enum: ['text', 'image', 'audio', 'video' , "link"] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Messsage", MesssageSchema);
