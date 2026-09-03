const express = require("express");
const router = express.Router();
const { AuthorizeUser, FindUser } = require("../../middleware/auth");
const  asyncHandler = require('../../middleware/asyncWrapper');
const blockchain = require("../../controller/admin/aggrement/BlockChain");



router.get("/admin/allAggremments", AuthorizeUser("admin"), asyncHandler(blockchain.getAggrementForAdminByOwnerIDs));
router.post("/admin/changeStatusOnBlockchain", AuthorizeUser("admin"), asyncHandler(blockchain.MakeAggrementForAdminByOwnerIDs));



module.exports = router;