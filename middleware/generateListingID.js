const mongoose = require("mongoose");

const ListingID = async(req, res, next) => {
    const listingId =  new mongoose.Types.ObjectId(); 
    req.listingId = listingId;
    next();
  }

module.exports = ListingID