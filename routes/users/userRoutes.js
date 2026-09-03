const express = require("express");
const router = express.Router();
const userController = require("../../controller/user/userController");
const passwardController = require("../../controller/password/passwordController");
const passport = require("passport");
const asyncHandler = require('../../middleware/asyncWrapper');
router.post("/register", asyncHandler(userController.Register));
router.post("/login", asyncHandler(userController.login));
router.post("/forget-password", asyncHandler(passwardController.CheckMailforForget));
router.post("/verify-otp", asyncHandler(passwardController.ConfirmOtp));
router.post("/reset-password", asyncHandler(passwardController.CreateNewPassword));
router.get("/logout", asyncHandler(userController.logout));

router.get(
  "/google",
  (req, res, next) => {
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/fail",
    failureMessage: "Failed to authenticate. Go back and try again.",
  }),
  (req, res, next) => {
    try {
      userController.handleGoogleCallback(req, res, next);
    } catch (err) {
      console.error("Passport authentication failed:", err);
      res.status(500).json({ message: "Authentication failed." });
    }
  }
);



// Facebook authentication routes
// router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
// router.get('/facebook/callback',
//     passport.authenticate('facebook', { failureRedirect: '/auth/signin' }),
//     (req, res) => {
//         req.logIn(req.user, (err) => {
//             if (err) {
//                 return res.redirect('/auth/signin');
//             }

//             res.redirect('/');
//         });
//     }
// );

module.exports = router;
