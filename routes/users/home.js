const express = require("express");
const router = express.Router();
const { AuthorizeUser, FindUser } = require("../../middleware/auth");
const home = require("../../controller/user/home");
const  asyncHandler = require('../../middleware/asyncWrapper');

router.get("/auth/user/home", AuthorizeUser("user" , "admin"), asyncHandler(home.userHome));


module.exports = router;
