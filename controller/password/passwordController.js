const Users = require("../../model/user/userModel");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const AppError = require("../../utils/AppError");

const { decodingToken,  decryptCookieForOtp, generatetokenForOtpForEncryption } = require("../../token/Tokens");
const sendMail = require("../../config/sendmail");
const { ERROR_MESSAGE } = require("../../messages/error");
const { RESPONCE_MESSAGE } = require("../../messages/response");
const { STATUS } = require("../../messages/status");
const forgetPasswordEmailTemplate = require("../../Mail/Templates/ForgetPassword");
const { ROLES , BOOLEAN} = require("../../utils/Roles");

const generateOTP = () => {
  let SendedOtp = otpGenerator.generate(6, {
    upperCase: BOOLEAN.FALSE,
    specialChars: BOOLEAN.FALSE,
  });
  const expirationTime = new Date();
  expirationTime.setMinutes(expirationTime.getMinutes() + 10);
  return { SendedOtp, expirationTime };
};

const CheckMailforForget = async (req, res ,next) => {
  const { email } = req.body;
  try {
    const Findmail = await Users.findOne({ email });
    if (Findmail.role === ROLES.ADMIN) {
      return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.EMAIL_NOT_FOUND, STATUS.NOT_FOUND))
    } else if (Findmail == null) {
      return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.PROVIDE_EMAIL, STATUS.NOT_FOUND))
    } else {
      const { SendedOtp, expirationTime } = generateOTP();


      await generatetokenForOtpForEncryption(
        SendedOtp,
        expirationTime,
        Findmail._id,
        Findmail.email,
        (Findmail.otpVerified = BOOLEAN.FALSE),
        (Findmail.emailVerified = BOOLEAN.TRUE),
        res
      );

      const to = email;
      const ForgetPassEmail = await forgetPasswordEmailTemplate(SendedOtp);

      if (forgetPasswordEmailTemplate) {
        const emailResult = await sendMail(to, ForgetPassEmail);

        if (emailResult.success) {
          return res.status(STATUS.SUCCESS).json({
            success: BOOLEAN.TRUE,
            message: RESPONCE_MESSAGE.OTP_SENT_EMAIL_SENT,
          });
        } else {
          return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.OTP_SENDING_ERROR, STATUS.INTERNAL_SERVER_ERROR))
        }
      } else {
        return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.EMAIL_NOT_FOUND, STATUS.NOT_FOUND))
      }
    }
  } catch (error) {
    next(error);
  }
};
const verifyOTP = async (userOTP, storedOTP, expirationTime) => {
  try {
    userOTP = userOTP.trim();
    storedOTP = storedOTP.trim();
    if (userOTP !== storedOTP) {
      return BOOLEAN.FALSE;
    }
    const currentTime = new Date();
    if (currentTime > expirationTime) {
      return BOOLEAN.FALSE;
    }
    return BOOLEAN.TRUE;
  } catch (error) {
    return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.OTP_VERIFICATION_FAILED, STATUS.INTERNAL_SERVER_ERROR))
  }
};
const ConfirmOtp = async (req, res, next) => {
  const { otp } = req.body;
  const cookieOtp = req.cookies.resetPasswordOTP;
  if (!cookieOtp) {
    return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.OTP_NOT_PROVIDED, STATUS.NOT_FOUND));
  }
  try {
    const { success, decoded: decodedToken } = await decodingToken(cookieOtp, process.env.JWT_API_SECRET_KEY);
    if (!success) {
      return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.OTP_EXPIRED, STATUS.UNAUTHORIZED));
    }
    const decryptedDecodedToken = decryptCookieForOtp(decodedToken);
    const parsedToken = JSON.parse(decryptedDecodedToken);
    const { SendedOtp, expirationTime, emailVerified, _id, email } = parsedToken;

    if (!SendedOtp) {
      return res
        .status(STATUS.NOT_FOUND)
        .json({ success: BOOLEAN.FALSE, message: ERROR_MESSAGE.OTP_TIMEOUT });
    }

    if (emailVerified) {
      const isOtpValid = await verifyOTP(otp, SendedOtp, new Date(expirationTime));
      if (isOtpValid) {
        await generatetokenForOtpForEncryption(
          SendedOtp,
          expirationTime,
          _id,
          email,
          (parsedToken.otpVerified = BOOLEAN.TRUE),
          (parsedToken.emailVerified = BOOLEAN.TRUE),
          res
        );

        return res
          .status(STATUS.SUCCESS)
          .json({ success: BOOLEAN.TRUE, message: RESPONCE_MESSAGE.OTP_VERIFIED });
      } else {
        res.clearCookie("resetPasswordOTP");
        return res.status(STATUS.BAD_REQUEST).json({
          success: BOOLEAN.FALSE,
          message: ERROR_MESSAGE.OTP_VERIFICATION_FAILED,
        });
      }
    } else {
      return res
        .status(STATUS.BAD_REQUEST)
        .json({ success: BOOLEAN.FALSE, message: ERROR_MESSAGE.PROVIDE_REGISTER_EMAIL });
    }
  } catch (error) {
    if (error.name === "TokenExpiredError") {
     return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.OTP_EXPIRED, STATUS.UNAUTHORIZED));
    }

    next(error);
  }
};
const CreateNewPassword = async (req, res , next) => {
  try {
    const Cookie = req.cookies.resetPasswordOTP;
    const { Password, RepeatPassword } = req.body;
    if (!Cookie) {
      return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.OTP_NOT_PROVIDED, STATUS.NOT_FOUND));
    }

    const { success, decoded: decodedToken } = await decodingToken(Cookie, process.env.JWT_API_SECRET_KEY);
    if (!success) {
      return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.OTP_EXPIRED, STATUS.UNAUTHORIZED));
    }
    const decrpyptedDecodedToken = decryptCookieForOtp(decodedToken);
    const parsedToken = JSON.parse(decrpyptedDecodedToken);
    if (parsedToken.otpVerified === BOOLEAN.FALSE) {
      return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.OTP_EXPIRED, STATUS.GATEWAY_TIMEOUT));
    }
 
    if (!Password || !RepeatPassword) {
      return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.PASSWORD_MISSING, STATUS.BAD_REQUEST));
    }
    if (Password !== RepeatPassword) {
      return  next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.PASSWAORD_NOT_MATCHED, STATUS.BAD_REQUEST));
    }

    const { _id } = parsedToken;
    const hashedPassword = await bcrypt.hash(Password, 10);
    const user = await Users.findByIdAndUpdate(
      _id,
      { password: hashedPassword },
      { new: BOOLEAN.TRUE },
      {
        updatedAt: Date.now(),
      }
    );

    if (!user) {
      return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.USER_NOT_FOUND, STATUS.NOT_FOUND));
    } else {

      res.clearCookie("resetPasswordOTP");
      res.clearCookie("jwt");

      return res.json({
        success: BOOLEAN.TRUE,
        message: RESPONCE_MESSAGE.PASSWORD_CHANGED,
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  CheckMailforForget,
  ConfirmOtp,
  CreateNewPassword,
};