const User = require("../../model/user/userModel");
const Aggrement = require("../../model/agreements/Aggrement");
const AggrementDetails = require("../../model/agreements/AggrementDetails");
const RentalItem = require("../../model/listings/RentalItemModel");
const { ERROR_MESSAGE } = require("../../messages/error");
const { RESPONCE_MESSAGE, AGGREEMENT, CONVERSATION } = require("../../messages/response");
const { STATUS } = require("../../messages/status");
const AppError = require("../../utils/AppError");
const { ROLES, BOOLEAN } = require("../../utils/Roles");
const QRCode = require('qrcode')
const { io } = require("../../utils/socket");
const Messsage = require("../../model/chat/MesssageModel");
const Conversation = require("../../model/chat/ConversationModel");



exports.fetchRenterAggreements = async (req, res, next)=>{
    try {
        const renter = req.user._id;
        const aggreements = await Aggrement.find({renterId:renter}).populate("agreementDetailsId").populate("ownerId").populate("listingId")
        if(aggreements){
            res.status(STATUS.SUCCESS).json({
                status: BOOLEAN.TRUE,
                message: RESPONCE_MESSAGE.USER_FETCHED,
                data: {
                    aggreements
                }
            });
        }else{
            res.status(STATUS.FORBIDDEN).json({
                status: BOOLEAN.FALSE,
                message: AGGREEMENT.AGGREMENT_NOT_AVAILABLE,

            });
        }
    } catch (error) {
        next(error)
    }

}