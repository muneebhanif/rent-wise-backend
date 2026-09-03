const mongoose = require("mongoose");


const LocationSchema = new mongoose.Schema({
    address: { type: String, required: true },
    city: { type: String,  },// required: true
    state: { type: String, required: true },
    country: { type: String, required: true },
    zipCode: { type: String,  }, // required: true
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
  });

  const Location = mongoose.model("Location", LocationSchema);
  module.exports = Location;