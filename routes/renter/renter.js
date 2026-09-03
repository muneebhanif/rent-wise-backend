const router = require("express").Router()
const asyncHandler = require('../../middleware/asyncWrapper');
const renter = require("../../controller/dashboard/renter")
const { AuthorizeUser } = require("../../middleware/auth");

router.get("/aggreements" , AuthorizeUser ("user" ,  "Admin" ) ,asyncHandler(renter.fetchRenterAggreements))


module.exports = router