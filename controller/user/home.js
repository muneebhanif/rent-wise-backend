const Users = require("../../model/user/userModel");
const { ERROR_MESSAGE  } = require("../../messages/error");
const {STATUS} = require("../../messages/status");
const { RESPONCE_MESSAGE } = require("../../messages/response");
const AppError = require("../../utils/AppError");
const { BOOLEAN } = require("../../utils/Roles");

exports.userHome = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await Users.findById(userId);

    if (!user) {
      throw new AppError(BOOLEAN.FALSE,ERROR_MESSAGE.USER_NOT_FOUND, STATUS_CODE.NOT_FOUND);
    }

    res.status(STATUS.SUCCESS).json({
      success: BOOLEAN.TRUE,
      message: RESPONCE_MESSAGE.USER_FETCHED,
      user,
    });
  } catch (error) {
    next(error); 
  }
};


exports.adminHome = async (req, res) => {};


exports.checkAuth = (req, res,next) => {
  try {
    res.status(STATUS.SUCCESS).json({
      success: BOOLEAN.TRUE,
      user: req.user
    });
  } catch (error) {
    next(error); 
  }
};