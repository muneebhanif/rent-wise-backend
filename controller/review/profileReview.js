const Aggrement = require("../../model/agreements/Aggrement");
const User = require("../../model/user/userModel")
const profileReview = require("../../model/reviews/profileReview");
const {CreateNotification} = require("../../controller/notification/notification")
const axios = require("axios")
const {
    AGGREEMENT,
    REVIEWS
} = require("../../messages/response");
const { STATUS } = require("../../messages/status");
const AppError = require("../../utils/AppError");
const {  BOOLEAN } = require("../../utils/Roles");

exports.CreateUserReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user._id;
        if (!rating || !comment?.trim()) {
            return next(new AppError(BOOLEAN.FALSE, "Rating and comment are required", STATUS.BAD_REQUEST));
        }
        const findUser = await User.findById(id);
        if (!findUser) {
            return res.status(STATUS.FORBIDDEN).json({
                Success: BOOLEAN.FALSE,
                message: REVIEWS.REVIEW_USER_NOT_FOUND
            })
        }

        if(id.toString() === userId.toString()) {
            return res.status(STATUS.FORBIDDEN).json({
                Success: BOOLEAN.FALSE,
                message: "You cannot review yourself"
            })
        }

        const findReviewerUser = await User.findById(userId);
        
        const CheckAggreement = await Aggrement.find({
            ownerId: id,
            renterId: userId,
            $or: [{ agreementStatus: "active" }, { agreementStatus: "Inactive" }],
        });
        if (!CheckAggreement.length) {
            return res.status(STATUS.FORBIDDEN).json({
                Success: BOOLEAN.FALSE,
                message: AGGREEMENT.RENTED_AGGREEMENT
            })
        }
        const existingReview = await profileReview.findOne({ reviewedUser: id, reviewer: userId });
        if (existingReview) {
            return res.status(STATUS.FORBIDDEN).json({
                Success: BOOLEAN.FALSE,
                message: REVIEWS.REVIEW_ALREADY_EXISTS_USER
            })
        }
        let sentiment = "neutral"; 
        try {
            const response = await axios.post(`${process.env.AI_MODEL_PORT}/predict`, { comment });
            sentiment = response.data.sentiment;
        } catch (error) {
            console.error("Sentiment Analysis Failed:", error.message);
        }
        const userprofileReview = await profileReview.create({
            reviewedUser: id,
            reviewer: userId,
            sentiment:sentiment,
            rating: rating,
            comment: comment,
            createdAt: Date.now(),
        });
        if (!userprofileReview) {
            return next(new AppError(BOOLEAN.FALSE, REVIEWS.NOT_CREATED, STATUS.NOT_FOUND))
        }
        if(userprofileReview){
            const notification = await CreateNotification(
              findUser._id,
              userId,
              'review',
              `${findReviewerUser.name} has Reviewd On your Profile`,          next,
              res,
            );
          }
        res.status(STATUS.SUCCESS).json({
            status: BOOLEAN.TRUE,
            data: {
                message: REVIEWS.REVIEW_REPORTED,
                review: userprofileReview,
            },
        });
    } catch (error) {
        next(error);
    }
};exports.getAllReviewsForUsers = async (req, res, next) => {
    try {
        const { id } = req.params
        const ProfileReview = await profileReview.find({ reviewedUser: id }).populate("reviewer")
        if (!ProfileReview) {
            return res.status(STATUS.FORBIDDEN).json({
                Success: BOOLEAN.FALSE,
                message: REVIEWS.REVIEW_USER_NOT_FOUND
            })
        }
        res.status(STATUS.SUCCESS).json({
            status: BOOLEAN.TRUE,
            data: {
                message: REVIEWS.REVIEW_FETCHED,
                reviews: ProfileReview,
            },
        });
    } catch (error) {
        next(error);
    }
};
