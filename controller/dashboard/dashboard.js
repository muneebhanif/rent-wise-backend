const User = require("../../model/user/userModel");
const logger = require("../../utils/logger");
const { ERROR_MESSAGE } = require("../../messages/error");
const { RESPONCE_MESSAGE, LISTINGS, NOTIFICATION, } = require("../../messages/response");
const { STATUS } = require("../../messages/status");
const { GetAndDecodeToken } = require("../../token/Tokens");
const bcrypt = require('bcrypt')
const AppError = require("../../utils/AppError");
const { ROLES, BOOLEAN } = require("../../utils/Roles");
const UserSettings = require("../../model/notification/notificationSetting")
const mongoose = require('mongoose')
const { enabled: cloudinaryEnabled, uploadFile } = require("../../utils/cloudinary");


exports.GetUser = async (req, res, next) => {
  try {
    const decodedToken = await GetAndDecodeToken(req, res);

    if (!decodedToken) {
      return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.INVALID_TOKEN, STATUS.UNAUTHORIZED));
    }

    const user = await User.findById(decodedToken.decoded._id).populate("NotificationSetting" , "notificationPreferences");
    if (!user) {
      return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.USER_NOT_FOUND, STATUS.NOT_FOUND));
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

exports.updateUserDashboardProfile = async (req, res, next) => {
  const { id } = req.params;
  const { name, email, bio,   notificationPreferences } = req.body;
  const { currentPassword, password, ...updateData } = req.body;
  if (bio === '' || bio === '\r\n') {
    delete updateData.bio;
  }

  try {
    if (!req.user || String(req.user._id) !== String(id)) {
      return next(new AppError(BOOLEAN.FALSE, "You can only update your own account", STATUS.FORBIDDEN));
    }
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.USER_NOT_FOUND, STATUS.NOT_FOUND));
    }
    if (req.file) {
      if (req.file.buffer) {
        if (!cloudinaryEnabled) {
          return next(new AppError(
            BOOLEAN.FALSE,
            "Profile image storage is not configured for this deployment",
            STATUS.INTERNAL_SERVER_ERROR
          ));
        }
        const uploaded = await uploadFile(req.file, `rentwise/profiles/${id}`);
        updateData.imageUrl = uploaded.secure_url;
      } else {
        updateData.imageUrl = `/uploads/profile/${id}/${req.file.filename}`;
      }
    }

    if (password) {
      if (user.googleId || user.facebookId) {
        
        return res.status(STATUS.FORBIDDEN).json({
          success: BOOLEAN.FALSE,
          message: RESPONCE_MESSAGE.CANNOT_CREATE_PASSWORD_IN_GOOGLE_OR_FACEBOOK_ACCOUNTS,
        });
      } else {

        const pass = await bcrypt.compare(currentPassword || '', user.password);
        if (!pass) {
          return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.CURRENT_PASSWORD_INVALID, STATUS.UNAUTHORIZED));
        }

        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }
    }

    let preferences = {};
    try {
      preferences = notificationPreferences ? JSON.parse(notificationPreferences) : {};
    } catch {
      preferences = {};
    }

    let userSettings = await UserSettings.findOneAndUpdate(
        { user: id },
        {
          notificationPreferences: {
            review: preferences.review ?? true,
            comment: preferences.comment ?? true,
            system: preferences.system ?? true,
            aggreement: preferences.aggreement ?? true,
            chat: preferences.chat ?? true,
          }
        },
        { new: true, upsert: true }
      );

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: BOOLEAN.TRUE,
      runValidators: BOOLEAN.TRUE,
    });

    return res.status(STATUS.SUCCESS).json({
      success: BOOLEAN.TRUE,
      message: RESPONCE_MESSAGE.USER_UPDATED,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};


exports.NotificationSubscription = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    const userId = req.user._id;
    if (!userId || !subscription) {
      return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.INVALID_DATA, STATUS.UNAUTHORIZED));

    }

    let userSettings = await UserSettings.findOne({ user: userId });

    if (userSettings) {
      userSettings.webPushSubscription = subscription;
      userSettings.updatedAt = new Date();
      await userSettings.save();
    } else {
      userSettings = await UserSettings.create({
        _id: new mongoose.Types.ObjectId(),
        user: userId,
        notificationPreferences: {
          review: true,
          comment:true,
          system: true,
          aggreement:true,
          chat:true,
        },
        webPushSubscription: subscription,
      });

      await User.findByIdAndUpdate(userId, {
        NotificationSetting: userSettings._id,
      });
    }

    res.status(STATUS.SUCCESS).json({ success: BOOLEAN.TRUE, message: NOTIFICATION.SYSTEM.NOTIFICATION_SUBSCRIBED });
  } catch (error) {
    next(error)
  }
};


exports.GetNotificationSubscription = async (req, res, next) => {
  try {

    const userId  = req.user._id
    const getSubscription = await UserSettings.findOne({ user: userId  })
    const hasSubscriptionNotification = getSubscription ? true : false;
    res.status(200).json({
      hasSubscriptionNotification
    });
  } catch (error) {
    next(error)
  }
}
