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


// cancellation flow: owner/renter can request cancellation, and other party confirms/declines
router.post("/requestCancellation", AuthorizeUser("user", "admin"), asyncHandler(Aggreement.requestCancellation));
router.post("/confirmCancellation", AuthorizeUser("user", "admin"), asyncHandler(Aggreement.confirmCancellation));
router.post("/declineCancellation", AuthorizeUser("user", "admin"), asyncHandler(Aggreement.declineCancellation));

module.exports = router;