const Users = require("../model/user/userModel");
const jsonwebtoken = require("jsonwebtoken");
const { BOOLEAN } = require("../utils/Roles");
const AppError = require("../utils/AppError");
const { ROLES, } = require("../utils/Roles");
const { STATUS } = require("../messages/status")


function clearCookies(req, res) {
  res.clearCookie("jwt");
}

exports.AuthorizeUser = (RequiredRole) => {
  return async (req, res, next) => {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(STATUS.UNAUTHORIZED).json({ message: "Please Login No token provided " });
    }

    try {
      const decodedToken = jsonwebtoken.verify(token, process.env.JWT_API_SECRET_KEY);
      const user = await Users.findById(decodedToken._id);

      if (!user) {
        clearCookies(req, res);
        return res.status(STATUS.UNAUTHORIZED).json({ message: "User not found" });
      }

      if (user.role !== ROLES.USER && user.role !== ROLES.ADMIN) {
        clearCookies(req, res);
        return res.status(STATUS.UNAUTHORIZED).json({ message: "Access denied - Only users and admins allowed" });
      }

      if (user.role === RequiredRole || (RequiredRole === ROLES.USER && user.role === ROLES.ADMIN)) {
        req.user = user;
        return next();
      } else {
        clearCookies(req, res);
        return next(new AppError(BOOLEAN.FALSE, "Unauthorized - Invalid", STATUS.UNAUTHORIZED));
      }
    } catch (error) {
      clearCookies(req, res);
      next(error);
    }
  };
};



exports.FindUser = async (req, res, next) => {
  try {
    const cookieOtp = req.cookies.resetPasswordOTP;

    if (!cookieOtp) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decodedToken = jsonwebtoken.verify(
      cookieOtp,
      process.env.JWT_API_SECRET_KEY
    );

    const { otpVerified, emailVerified } = decodedToken;

    if (emailVerified === BOOLEAN.FALSE) {
      if (otpVerified === BOOLEAN.FALSE) {
        return res.status(401).json({ message: "OTP not verified" });
      }
      return res.status(401).json({ message: "Email not verified" });
    }

    next();
  } catch (error) {
    next(error);
  }
};
