const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
    url: { type: String, required: true },
    caption: { type: String },
});
const Image = mongoose.model("Image", ImageSchema);
module.exports = Image;