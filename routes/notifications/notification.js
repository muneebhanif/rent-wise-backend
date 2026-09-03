const express = require("express");
const router = express.Router();
const notification = require("../../controller/notification/notification");
const asyncHandler = require("../../middleware/asyncWrapper");
const { AuthorizeUser } = require("../../middleware/auth");

router.get(
  "/get-notifications",
  AuthorizeUser("user" , "Admin") ,
  asyncHandler(notification.getNotificationByUser)
);

router.patch(
  "/read-all-notifications",
  AuthorizeUser("user" , "Admin") ,
  asyncHandler(notification.readAllNotificationByUser)
);

router.delete(
  "/clear-all-notifications",
  AuthorizeUser("user" , "Admin") ,
  asyncHandler(notification.clearAllNotificationByUser)
);

router.patch(
  "/read-notification/:notificationId",
  AuthorizeUser("user" , "Admin") ,
  asyncHandler(notification.ReadOneNotificationByUser)
);

module.exports = router;
