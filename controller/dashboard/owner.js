const User = require("../../model/user/userModel");
const Aggrement = require("../../model/agreements/Aggrement");
const AggrementDetails = require("../../model/agreements/AggrementDetails");
const RentalItem = require("../../model/listings/RentalItemModel");
const Conversation = require("../../model/chat/ConversationModel");
const { ERROR_MESSAGE } = require("../../messages/error");
const { RESPONCE_MESSAGE, AGGREEMENT, CONVERSATION } = require("../../messages/response");
const { STATUS } = require("../../messages/status");
const AppError = require("../../utils/AppError");
const { ROLES, BOOLEAN } = require("../../utils/Roles");
const QRCode = require('qrcode')
const { io } = require("../../utils/socket");



exports.OwnerProfileData = async (req, res, next) => {
    try {
        const requestedUserId = req.params.id;

        // const userViewerId = req.user._id;

        const user = await User.findOne({ _id: requestedUserId });
        // const userViewer = await User.findOne({ _id: userViewerId });
        // if(!userViewer){
        //     res.status(STATUS.NOT_FOUND).json({
        //         status: BOOLEAN.FALSE,
        //         message: RESPONCE_MESSAGE.USER_NOT_FOUND_PLEASE_REGISTER
        //     });
        // }

        if (user) {
            const listings = await RentalItem.find({ owner: user._id })
            .populate("images")
            .populate("videos")
            res.status(STATUS.SUCCESS).json({
                status: BOOLEAN.TRUE,
                message: RESPONCE_MESSAGE.USER_FETCHED,
                data: {
                    user,
                    listings
                }
            });
        } else {
            res.status(STATUS.NOT_FOUND).json({
                status: BOOLEAN.FALSE,
                message: RESPONCE_MESSAGE.USER_NOT_FOUND
            });
        }
    } catch (error) {
        next(error);
    }
};
