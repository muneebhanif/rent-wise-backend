const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const helmet = require("helmet");
const xss = require("xss-clean");
const hpp = require("hpp");
const session = require("express-session");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const limiter = require("./utils/Limitar");
const connectDB = require("./config/db");
const { corsOptions } = require("./utils/cors");
const { initializeAdmin } = require("./controller/user/userController");
const userRoutes = require("./routes/users/userRoutes");
const home = require("./routes/users/home");
const loggedUser = require("./routes/users/auth");
const listingRoutes = require("./routes/listings/listingRoutes");
const dashboardRoutes = require("./routes/dashboard/dashboardRoute");
const commentRoutes = require("./routes/comment/commentRoutes");
const ConversationRoutes = require("./routes/chats/ConversationRoutes");
const AgreementRoutes = require("./routes/aggrement/Aggreementt");
const BlockChainRoutes = require("./routes/blockchain/blockchain");
const HomeListings = require("./routes/home/HomelistingRoutes");
const Owner = require("./routes/owner/owner");
const Renter = require("./routes/renter/renter");
const Review = require("./routes/reviews/reviews");
const Notification = require("./routes/notifications/notification");
const admin = require("./routes/admin/adminRoutes")
const logger = require("./utils/logger");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const AppError = require("./utils/AppError");
const asyncHandler = require("./middleware/asyncWrapper");
const { setupSocket, io, app, server } = require("./utils/socket");
const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
// Register Passport strategies when the app is loaded by Vercel as well as
// when it is started with `node server.js`.
require("./utils/third_party_Login");


app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(xss());
app.use(hpp());
// app.use(limiter);

app.use(cors(corsOptions));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: false,
      sameSite: isProduction ? "None" : "Lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());


app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} ${req.hostname}`);
  next();
});

app.get(
  "/err",
  asyncHandler(async (req, res, next) => {
    throw new Error("This is a custom error message");
  })
);

// Routes
app.use("/", home);
app.use("/auth", userRoutes);
app.use("/listings", listingRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/comments", commentRoutes);
app.use("/agreement", AgreementRoutes);
app.use("/conversations", ConversationRoutes);
app.use("/auth/user", loggedUser);
app.use("/auth/blockchain", BlockChainRoutes);
app.use("/Specificlistings", HomeListings);
app.use("/owner", Owner);
app.use("/renter", Renter);
app.use("/review", Review);
app.use("/notification", Notification);
app.use("/rentWise" , admin)


app.use(errorHandler);
app.use(notFound);
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json({ success: err.success, message: err.message });
  }
  res.status(500).json({ message: "Internal Server Error" });
});



process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.message);
  console.error(err.stack);
  logger.error(`Unhandled Exception: ${err.message}`);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  logger.error(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// Graceful shutdown handler
const shutdown = () => {
  console.log("Received shutdown signal, gracefully shutting down...");
  
  if (connectDB && connectDB.close) {
    connectDB.close()
      .then(() => {
        console.log("Database connection closed.");
      })
      .catch((err) => {
        console.error("Error closing the database connection:", err);
      });
  }
  
  server.close(() => {
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error("Forcefully shutting down due to timeout...");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const startServer = async () => {
  try {
    await Promise.all([
      connectDB(),
    ]);
    
    initializeAdmin();
    
    server.listen(3600, '0.0.0.0', () => {
      console.log("Server is running on port 3600");
    });
  } catch (error) {
    console.error("Error during server startup:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
