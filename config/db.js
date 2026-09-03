const mongoose = require("mongoose");

const connectDB = async () => {
  try {
  //  await mongoose.connect(process.env.DB_URL_online);
 await mongoose.connect(process.env.DB_URL);
  } catch (error) {
    console.log("Error connecting to the database:", error);
  }
};

module.exports = connectDB;