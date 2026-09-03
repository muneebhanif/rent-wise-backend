const router = require("express").Router();
const UserDashboard = require("../../controller/dashboard/dashboard");
const profileImage = require("../../utils/profileFile");
const  asyncHandler = require('../../middleware/asyncWrapper');
const review = require("../../controller/review/review")
const { AuthorizeUser } = require("../../middleware/auth");



router.get("/getUserDashboard", asyncHandler(UserDashboard.GetUser));

router.put("/updateUserDashboardProfile/:id", profileImage.single("avatar"), asyncHandler(UserDashboard.updateUserDashboardProfile));

router.get("/reviews" , AuthorizeUser("user" , "Admin" ) , asyncHandler(review.ToGetReview))

router.post("/save-subscription" , AuthorizeUser("user" , "Admin" ) , asyncHandler(UserDashboard.NotificationSubscription))


router.get("/get-subscription" , AuthorizeUser("user" , "Admin" ) , asyncHandler(UserDashboard.GetNotificationSubscription))


// new route added
// router.post("/update-subscription", AuthorizeUser("user" , "Admin" ), asyncHandler(UserDashboard.UpdateSubscription))


// router.post("/save-subscription"  , asyncHandler(UserDashboard.NotificationSubscription))



module.exports = router