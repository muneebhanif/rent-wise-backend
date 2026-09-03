const express = require("express");
const router = express.Router();
const { AuthorizeUser, FindUser } = require("../../middleware/auth");
const asyncHandler = require('../../middleware/asyncWrapper');


const HomeListings = require("../../controller/homePage/listingsCategories")


router.get("/car", asyncHandler(HomeListings.getAllCarsListings));
router.get("/house", asyncHandler(HomeListings.getAllHouseListings));
router.get("/hostel", asyncHandler(HomeListings.getAllHostelListings));



module.exports = router