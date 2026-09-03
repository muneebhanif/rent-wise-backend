const router = require("express").Router()
const asyncHandler = require('../../middleware/asyncWrapper');
const { AuthorizeUser } = require("../../middleware/auth");
const Review = require("../../controller/review/review")
const Listing = require("../../controller/review/listingReview")
const User = require("../../controller/review/profileReview")


// Listing Review Routes

router.post("/Createlisting/:id" , AuthorizeUser("user" , "Admin") , asyncHandler(Listing.CreateListReview))


// Get All One listing Review
// Listing reviews are public; only creating a review requires authentication.
router.get("/listing/:id" , asyncHandler(Listing.getAllReviewsForRentalItem))



// User Review Routes

router.post("/CreateUser/:id" , AuthorizeUser("user" , "Admin") , asyncHandler(User.CreateUserReview))


// Profile reviews are public; only creating a review requires authentication.
router.get("/User/:id" , asyncHandler(User.getAllReviewsForUsers))


module.exports = router
