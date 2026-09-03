const app = require("../server");
const connectDB = require("../config/db");
const { initializeAdmin } = require("../controller/user/userController");

let databaseConnection;
let adminInitialization;

module.exports = async (req, res) => {
  try {
    databaseConnection ||= connectDB();
    await databaseConnection;
    adminInitialization ||= initializeAdmin();
    await adminInitialization;
    return app(req, res);
  } catch (error) {
    console.error("Serverless backend startup failed:", error);
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
};
