const logger = require("../utils/logger");

class AppError extends Error {
    constructor(success , message, statusCode) {
        super(message);
        this.success = success || false;
        this.statusCode = statusCode;
        this.isOperational = true;
        logger.error(message);
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;