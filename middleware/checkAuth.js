const jwt = require("jsonwebtoken");
const User = require("../model/user/userModel");
exports.protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_API_SECRET_KEY);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    const user = await User.findById(decoded._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Attaching the authenticated user object to the request
    req.user = user;

    next();
  } catch (error) {
  next(error);
  }
};
