const router = require("express").Router();
const asyncHandler = require('../../middleware/asyncWrapper');
const Aggreement = require("../../controller/aggreement/AggreementDetails")
const { AuthorizeUser } = require("../../middleware/auth");



router.post('/createAggreement', AuthorizeUser("user", "admin"), asyncHandler(Aggreement.CreateAggrement));

router.post("/sentaggreement", AuthorizeUser("user", "admin"), asyncHandler(Aggreement.sentAggreement));

router.get("/GetByOwnerId", AuthorizeUser("user", "admin"), asyncHandler(Aggreement.getByOwnerId));

router.post("/getAggrementDetails", AuthorizeUser("user", "admin"), asyncHandler(Aggreement.GetByAggrementId));


// this is only for renter to view the aggrement and confirm the aggrement status
router.post("/VerifyAggrementByRenter", AuthorizeUser("user", "admin"), asyncHandler(Aggreement.VerifyAggrementByRenter));


// this is only for owner to update the aggrement status and update the aggrement details
router.post("/updateAggreementByOwner", AuthorizeUser("user", "admin"), asyncHandler(Aggreement.UpdateAggrementByOwner));



module.exports = router;