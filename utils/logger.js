const { createLogger, format, transports } = require('winston');
const logger = createLogger({
    level: 'silly',
    format: format.combine(
        format.colorize(),
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.printf(
            ({ timestamp, level, message, hostname }) => `${timestamp}  ${level}: ${message} ${hostname} `
        ),
        format.simple()
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'error.log', level: 'error' }),
        new transports.File({ filename: 'combined.log' })
    ]
});
module.exports = logger
