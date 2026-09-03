const router = require("express").Router();
const Comments = require("../../controller/comments/ListingCommentsController")
const  asyncHandler = require('../../middleware/asyncWrapper');
const { AuthorizeUser } = require("../../middleware/auth");


router.post("/createListingComment", AuthorizeUser("user"), asyncHandler(Comments.createComment))

router.post("/comment" , asyncHandler(Comments.Check) )

router.get("/showSpecificListComments/:id" , asyncHandler(Comments.showSpecificListComments) )

// router.post("/reply" , Comments.listingcommentReply )

router.get("/CommentWithReply/:id" ,  asyncHandler(Comments.getCommentsWithReplies))
// router.get("/CommentWithReply" ,  Comments.getCommentsWithReplies)



router.delete("/deleteComment/:id" ,asyncHandler( Comments.deleteComments))

router.delete("/deleteReply/:id" , asyncHandler(Comments.deleteCommentsReplies))

module.exports = router
