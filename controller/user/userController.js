const Users = require("../../model/user/userModel");
const bcrypt = require("bcrypt");
const logger = require("../../utils/logger");
const { GenerateToken, decodingToken } = require("../../token/Tokens");
const { ERROR_MESSAGE } = require("../../messages/error");
const { RESPONCE_MESSAGE } = require("../../messages/response");
const { STATUS } = require("../../messages/status");
const AppError = require("../../utils/AppError");
const { BOOLEAN } = require("../../utils/Roles");
const initializeAdmin = async (next) => {
  try {
    const adminExists = await Users.findOne({ role: "admin" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin", 10);
      await Users.create({
        name: "admin",
        email: "admin@rentwise.com",
        password: hashedPassword,
        role: "admin",
      });
    }
  } catch (error) {
    throw new AppError(BOOLEAN.FALSE,ERROR_MESSAGE.ADMIN_INITLIAZED_ERROR, STATUS.INTERNAL_SERVER_ERROR)
  }
};
const Register = async (req, res , next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return next(new AppError(BOOLEAN.FALSE,ERROR_MESSAGE.INVALID_INPUT, STATUS.BAD_REQUEST))
    }
    if (name.length < 5) {
      return next(new AppError(BOOLEAN.FALSE,ERROR_MESSAGE.NAME_VALIDATION_FAILED, STATUS.BAD_REQUEST))
    }
    if (password.length < 8) {
      return next(new AppError( BOOLEAN.FALSE ,ERROR_MESSAGE.PASSWORD_VALIDATION_FAILED, STATUS.BAD_REQUEST))
    }
    if (!email || !password) {
      return next(new AppError(BOOLEAN.FALSE,ERROR_MESSAGE.INVALID_INPUT, STATUS.BAD_REQUEST))
    }
    if (await Users.findOne({ email })) {
      return next(new AppError( BOOLEAN.FALSE , ERROR_MESSAGE.EMAIL_ALREADY_EXISTS, STATUS.BAD_REQUEST))
    }
    if (await Users.findOne({ email })) {
      return next(new AppError(BOOLEAN.FALSE,ERROR_MESSAGE.EMAIL_ALREADY_EXISTS, STATUS.BAD_REQUEST))
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await Users.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });
    if (newUser) {
      const token = await GenerateToken(newUser, req, res , next);
      return res.status(STATUS.CREATED).json({ message: RESPONCE_MESSAGE.USER_REGISTERED, token });
    }
  } catch (error) {
    next(error); 
  }
};
const login = async (req, res, next) => {
  try {
    const { your_email, your_pass } = req.body;
    const user = await Users.findOne({ email: your_email });
    if (!user) {
      return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.EMAIL_NOT_FOUND, STATUS.UNAUTHORIZED));
    }
    const isPasswordValid = await user.comparePassword(your_pass);
    if (!isPasswordValid) {
      return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.INVALID_PASSWORD, STATUS.UNAUTHORIZED));
    }
    await GenerateToken(user, req, res, next);
    return res.status(STATUS.SUCCESS).json({
      message: RESPONCE_MESSAGE.LOGIN_SUCCESS,
      user: { id: user._id, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};
const handleGoogleCallback = async (req, res ,next) => {
  try {
    console.log("Callback URL: ", process.env.GOOGLE_CALLBACK_URL);
    await GenerateToken(req.user, req, res);
    res.redirect(process.env.CLIENT_URL || "http://localhost:4000/" );
  } catch (error) {
    next(error); 
  }
};
const logout = async (req, res , next) => {
  try {
    await res.clearCookie("jwt");
    await res.clearCookie("resetPasswordOTP");
    await req.session.destroy();
    return res.status(STATUS.SUCCESS).json({ message: RESPONCE_MESSAGE.LOGOUT_SUCCESS });
  } catch (error) {
    next(error); 
  }
};
module.exports = {
  initializeAdmin,
  Register,
  login,
  handleGoogleCallback,
  logout,
};