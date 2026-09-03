const mongoose = require("mongoose");
const VideoSchema = new mongoose.Schema({
    url: { type: String, required: true },
    caption: { type: String },
  });

  const Video = mongoose.model("Video", VideoSchema);

  module.exports = Video;