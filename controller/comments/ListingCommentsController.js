const  Comment = require("../../model/comments/listingCommentModel");
const Reply = require("../../model/comments/listingReplyModel");
const User = require("../../model/user/userModel");
const {
  RESPONCE_MESSAGE,
  AGGREEMENT,
  CONVERSATION,
  REVIEWS,
  NOTIFICATION,
  COMMENTS,
} = require("../../messages/response");
const { STATUS } = require("../../messages/status");
const { ERROR_MESSAGE } = require("../../messages/error");
const logger = require("../../utils/logger");
const AppError = require("../../utils/AppError");
const { ROLES , BOOLEAN} = require("../../utils/Roles");
const {CreateNotification} = require("../../controller/notification/notification")
const RentalItem = require("../../model/listings/RentalItemModel");
exports.createComment = async (req, res , next) => {
    try {
        const { rental, text } = req.body;
        const author = req.user._id;
        const rentalDetails = await RentalItem.findById(rental).select('owner title');
        const author_name = await User.findById(author).select('name');
        if(!rental || !author || !text){
        return next(new AppError (BOOLEAN.FALSE , ERROR_MESSAGE.INVALID_DATA , STATUS.BAD_REQUEST));
        }
        if (!rentalDetails || !author_name) {
          return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.INVALID_DATA, STATUS.BAD_REQUEST));
        }
        const comment = await Comment.create({ rental, author, text });
        if (!comment) {
            return next(new AppError(BOOLEAN.FALSE , COMMENTS.COMMENT_NOT_CREATED , STATUS.BAD_REQUEST));
        }

        const notification = await CreateNotification(
          rentalDetails.owner,
          author,
          'comment',
          `${author_name.name} Commented On your ${rentalDetails.title} Listing`,          next,
          res,
      );

return res.status(STATUS.CREATED).json({ 
    message: RESPONCE_MESSAGE.COMMENT_CREATED, 
    comment, 
    notification 
})
      

       
    } catch (error) {
        next(error);
    }
};


exports.Check = async(req, res )=>{
    const Data = req.body;
}


exports.showSpecificListComments = async (req, res , next) => {
    try {
        const { id } = req.body;
        const comments = await Comment.find({ id }).populate("author", "name email imageUrl").populate("rental", "title").sort({ createdAt: -1 });
        if (!comments) {
return next(new AppError(BOOLEAN.FALSE , COMMENTS.COMMENT_NOT_FOUND , STATUS.NOT_FOUND));
        }
        res.status(STATUS.SUCCESS).json({ message: COMMENTS.COMMENT_FETCHED, comments });
    } catch (error) {
        next(error);
    }
};





exports.getCommentsWithReplies = async (req, res , next) => {
  try {
    const { id: rental } = req.params;

    const comments = await Comment.find({ rental })
      .populate({
        path: "replies",
        populate: [
          {
            path: "author",
            select: "name imageUrl",
          },
          {
            path: "replies", 
            populate: {
              path: "author", 
              select: "name imageUrl",
            },
          },
        ],
      })
      .populate("author", "name imageUrl");
      if (!comments) {
        return next(new AppError(BOOLEAN.FALSE , COMMENTS.COMMENT_NOT_FOUND , STATUS.NOT_FOUND));
      }

    res.status(STATUS.SUCCESS).json({ comments });
  } catch (error) {
  next(error);
  }
};


  exports.deleteComments = async (req, res , next) => {
    try {
      const { id } = req.params;
      const comment = await Comment.findById(id);
      if (!comment) {
        return next(new AppError(BOOLEAN.FALSE , COMMENTS.COMMENT_NOT_FOUND , STATUS.NOT_FOUND));
      }

      await Comment.findByIdAndDelete(id);
      res.status(STATUS.SUCCESS).json({ message: COMMENTS.COMMENT_DELETED });

    } catch (error) {
      next(error);
    }
  };



  
  exports.deleteCommentsReplies = async(req,res , next)=>{
    try {
      const { id } = req.params;
      const reply = await Reply.findById(id);
      if (!reply) {
      return next(new AppError(BOOLEAN.FALSE , COMMENTS.COMMENT_NOT_FOUND , STATUS.NOT_FOUND));
      }
      await Reply.findByIdAndDelete(id);
      res.status(STATUS.SUCCESS).json({ message: COMMENTS.COMMENT_DELETED });

    } catch (error) {
      next(error);
    }
  }
