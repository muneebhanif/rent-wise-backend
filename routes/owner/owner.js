const router = require("express").Router()
const asyncHandler = require('../../middleware/asyncWrapper');
const owner = require("../../controller/dashboard/owner")
const { AuthorizeUser } = require("../../middleware/auth");

router.get("/profile/:id"  ,asyncHandler(owner.OwnerProfileData))
// router.get("/profile/:id" , AuthorizeUser ("user" ,  "Admin" ) ,asyncHandler(owner.OwnerProfileData))


module.exports = router