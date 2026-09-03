const nodemailer = require("nodemailer");
const { BOOLEAN } = require("../utils/Roles");

const sendMail = async (to, emailContent ,  next) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "sandbox.smtp.mailtrap.io",
            port: 2525,
            auth: {
                user: process.env.MAILTRAP_USER,
                pass: process.env.MAILTRAP_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: "Reset Your Password  < uYn3T@example.com>",
            to: to,
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html,
        });
        return { success: BOOLEAN.TRUE, messageId: info.messageId };
    } catch (error) {
        next(error);
    }
};

module.exports = sendMail;
