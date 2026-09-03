const logger = require("../utils/logger");
const { ERROR_MESSAGE } = require("../messages/error");
const { STATUS } = require("../messages/status");
const errorHandler = (err, req, res, next) => {
    const statusCode = err?.statusCode || STATUS.INTERNAL_SERVER_ERROR;
    const errMessage = err?.message || ERROR_MESSAGE.INTERNAL_SERVER_ERROR;
    logger.error(errMessage);
    logger.error(err?.stack);
    if (process.env.NODE_ENV !== "production") {
        console.error(`[Error]: ${errMessage}` , `[Stack]: ${err?.stack}`);
    }
    res.status(statusCode).json({
        success: false,
        message: errMessage,
        stack: process.env.NODE_ENV === 'production' ? null : err?.stack,
    });
}
const notFound = (req, res, next) => {
    res.status(STATUS.NOT_FOUND ).json({ message: ERROR_MESSAGE.ROUTE_NOT_FOUND });
}
module.exports = {errorHandler , notFound};