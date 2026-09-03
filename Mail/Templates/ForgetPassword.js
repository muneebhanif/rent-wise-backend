
const forgetPasswordEmailTemplate = async(SendedOtp) => {
  return {
    subject: "Your OTP for Resetting the Password",
    text: `Your OTP is ${SendedOtp}. It expires in 2 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #333;">Reset Password</h2>
        <p style="font-size: 16px; color: #333;">
          Dear User,
        </p>
        <p style="font-size: 16px; color: #333;">
          You have requested to reset your password. Please use the following One-Time Password (OTP) to proceed with resetting your password. This OTP is valid for 2 minutes.
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #333; background: #f0f0f0; padding: 10px 20px; border-radius: 5px; display: inline-block;">
            ${SendedOtp}
          </span>
        </div>
        <p style="font-size: 16px; color: #333;">
          If you did not request a password reset, please ignore this email.
        </p>
        <p style="font-size: 16px; color: #333;">
          Thank you,
          <br>
          The Support Team
        </p>
      </div>
    `
  };
};

module.exports = forgetPasswordEmailTemplate;
