const Aggrement = require("../../model/agreements/Aggrement");
const RentalItem = require("../../model/listings/RentalItemModel");
const listingReview = require("../../model/reviews/listingReview");
const User = require("../../model/user/userModel");
const {
  AGGREEMENT,
  REVIEWS
} = require("../../messages/response");
const { STATUS } = require("../../messages/status");
const {  BOOLEAN } = require("../../utils/Roles");
const {CreateNotification} = require("../../controller/notification/notification")
exports.CreateListReview = async (req, res, next) => {
  try {
    const { id } = req.params
    const {  rating, comment } = req.body;
    const userId = req.user._id;
    const listing =  await RentalItem.findById(id)
    const userName = await User.findById(userId).select('name');
    if(!listing) {
      return res.status(STATUS.FORBIDDEN).json({
        Success: BOOLEAN.FALSE,
        message: REVIEWS.REVIEW_LISTING_NOT_FOUND
    })
    }
    const CheckAggreement = await Aggrement.findOne({
        listingId: id,
        renterId: userId,
        $or: [
          { agreementStatus: "active" },
          { agreementStatus: "Inactive" },
          { agreementStatus: "pending" }
        ]
    });
    if (!CheckAggreement) {
      return res.status(STATUS.FORBIDDEN).json({
        Success: BOOLEAN.FALSE,
        message: AGGREEMENT.RENTED_AGGREEMENT
    })
    }
    const existingReview = await listingReview.findOne({
      listing: id,
      reviewer: userId
    });
    if (existingReview) {
      return res.status(STATUS.FORBIDDEN).json({
        Success: BOOLEAN.FALSE,
        message: REVIEWS.REVIEW_ALREADY_EXISTS_LISTING
    })
    }
    const ListingReview = await listingReview.create({
      listing: id,
      rating: rating,
      comment: comment,
      reviewer: userId,
      createdAt: Date.now(),
    });
    if(ListingReview){
       await CreateNotification(
        listing.owner,
        userId,
        'review',
        `${userName.name} has Reviewd On your ${listing.title} Listing`,          next,
        res,
      );
    }
    res.status(STATUS.SUCCESS).json({
      status: BOOLEAN.TRUE,
      data: {
          message: REVIEWS.REVIEW_REPORTED,
          review: ListingReview,
      },
  });
  } catch (error) {
    next(error);
  }
};

exports.getAllReviewsForRentalItem = async (req, res, next) => {
  try {
    const { id } = req.params
    const ListingReview  = await  listingReview.find({listing:id }).populate("reviewer")
    if (!ListingReview) {
      return res.status(STATUS.FORBIDDEN).json({
        Success: BOOLEAN.FALSE,
        message: REVIEWS.REVIEW_LISTING_NOT_FOUND
    })
    }
    res.status(STATUS.SUCCESS).json({
      status: BOOLEAN.TRUE,
      data: {
          message: REVIEWS.REVIEW_FETCHED,
          reviews: ListingReview,
      },
  });
  } catch (error) {
    next(error);
  }
};
