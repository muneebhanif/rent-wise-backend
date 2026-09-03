const jsonwebtoken = require("jsonwebtoken");
const crypto = require('crypto');
require("dotenv").config();
const AppError = require("../utils/AppError");
const { ERROR_MESSAGE } = require("../messages/error");
const { STATUS } = require("../messages/status");
const { RESPONCE_MESSAGE } = require("../messages/response");
const { BOOLEAN } = require("../utils/Roles");
const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

const makeToken = async (_id) => {
  return jsonwebtoken.sign({ _id }, process.env.JWT_API_SECRET_KEY, {
    expiresIn: "30d",
  });
};


const GenerateToken = async (user, req, res, next) => {
  try {
    await res.clearCookie("jwt");
    const token = await makeToken(user._id);
    res.cookie("jwt", token, {
      httpOnly: BOOLEAN.TRUE,
     secure: isProduction,
      maxAge: 30 * 24 * 60 * 60 * 1000,
     sameSite: isProduction ? "None" : "Lax",
    
      // sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      //   secure: process.env.NODE_ENV === 'production', // Use HTTPS in production

       // use if you want to access on network IP

      // secure: false,        
      // sameSite: "lax", 
     
    });

    return token;
  } catch (error) {
    next(error);
  }
};
const CreateToken = async (payload) => {
  const otptoken = jsonwebtoken.sign(payload, process.env.JWT_API_SECRET_KEY, {
    expiresIn: "5m",
  });
  return otptoken;
};





const decodingToken = async (token, key) => {
  try {
    const decoded = jsonwebtoken.verify(token, key);
    return { success: BOOLEAN.TRUE, decoded };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.TOKEN_EXPIRED, STATUS.UNAUTHORIZED);
    }
    throw new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.INVALID_TOKEN, STATUS.UNAUTHORIZED);
  }
};

const GetAndDecodeToken = async (req, res, next) => {
  const token = req.cookies.jwt; // Ensure req is passed

  if (!token) {
    return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.TOKEN_NOT_FOUND, STATUS.NOT_FOUND));
  }

  try {
    const decodedToken = await decodingToken(token, process.env.JWT_API_SECRET_KEY);
    return decodedToken;
  } catch (error) {
    next(error);
  }
};








//Encryption token for Otp & Decryption token for Otp

const generatetokenForOtpForEncryption = async (
  SendedOtp,
  expirationTime,
  _id,
  email,
  otpVerified = false,
  emailVerified = false,
  res
) => {
  const payload = {
    SendedOtp,
    expirationTime,
    _id,
    email,
    otpVerified,
    emailVerified,
  };

  const jsonStringPayloadForOtp = JSON.stringify(payload);

  const encryptedOtp = encryptCookieForOtp(jsonStringPayloadForOtp);
  const tok = await CreateToken({ SendedOtp: encryptedOtp });

  if (res) {
    res.cookie("resetPasswordOTP", tok, {
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: BOOLEAN.TRUE,
    });
  }

  return tok;
};



const verifyEncryptedCookieForOtp = (req, res, next) => {
  const encryptedCookie = req.cookies.resetPasswordToken;

  if (!encryptedCookie) {
    return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.TOKEN_NOT_FOUND, STATUS_CODE.NOT_FOUND));
  }

  try {
    const decryptedData = decryptCookieForOtp(encryptedCookie);
    const cookieData = JSON.parse(decryptedData); // Parse the decrypted cookie data

    // Proceed with password reset verification logic
    return res.status(200).json({ success: BOOLEAN.TRUE, data: cookieData });
  } catch (error) {
    return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.DECRYPTION_ERROR, STATUS_CODE.NOT_FOUND));
  }
};

const encryptCookieForOtp = (text) => {
  if (typeof text !== 'string' || text.length === 0) {
    throw new TypeError('The text to encrypt must be a non-empty string.');
  }

  const algorithm = 'aes-256-cbc'; // Encryption algorithm
  const secretKey = process.env.COOKIE_ENCRYPTION_KEY; // Secret key (256-bit)

  if (!secretKey) {
    throw new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.SECRET_KEY_NOT_DEFINED, STATUS_CODE.NOT_FOUND);
  }

  const iv = crypto.randomBytes(16); // Initialization vector
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, 'hex'), iv);

  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Return the encrypted data along with the IV, as both are needed for decryption
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};




function decryptCookieForOtp(decodedToken) {
  const secretKeyHex = process.env.COOKIE_ENCRYPTION_KEY;

  if (!secretKeyHex) {
    throw new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.SECRET_KEY_NOT_DEFINED, STATUS_CODE.NOT_FOUND);
  }

  const secretKey = Buffer.from(secretKeyHex, 'hex');

  if (secretKey.length !== 32) {
    throw new Error('Invalid key length. The key must be 32 bytes (64 hex characters) for AES-256-CBC.');
  }

  const encryptedData = decodedToken.SendedOtp;
  const [ivHex, encryptedHex] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}







module.exports = {
  GenerateToken,
  makeToken,
  CreateToken,
  generatetokenForOtpForEncryption,
  decodingToken,
  verifyEncryptedCookieForOtp,
  decryptCookieForOtp,
  GetAndDecodeToken
};
