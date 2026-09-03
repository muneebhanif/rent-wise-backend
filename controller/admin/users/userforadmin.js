const Aggrement = require("../../../model/agreements/Aggrement");
const AggrementDetails = require("../../../model/agreements/AggrementDetails");
const RentalItem = require("../../../model/listings/RentalItemModel");
const BlockChainAggrement = require("../../../model/agreements/BlockChainAggrements");
const logger = require("../../../utils/logger");
const { ERROR_MESSAGE } = require("../../../messages/error");
const User = require("../../../model/user/userModel")
const {
    RESPONCE_MESSAGE,
    AGGREEMENT,
    CONVERSATION,
} = require("../../../messages/response");
const {
    adminMessages
} = require("../../../messages/adminMessages");
const { STATUS } = require("../../../messages/status");
const AppError = require("../../../utils/AppError");
const { ROLES, BOOLEAN } = require("../../../utils/Roles");
const QRCode = require("qrcode");
const { io } = require("../../../utils/socket");
const Messsage = require("../../../model/chat/MesssageModel");
const Conversation = require("../../../model/chat/ConversationModel");
const {CreateNotification} = require("../../notification/notification")



exports.userManage = async(req,res,next)=>{
    try {
        
        const allUser = await User.find()

        res.status(200).json({
            status: STATUS.SUCCESS,
            message: RESPONCE_MESSAGE.SUCCESS,
            data: {
                allUser,
            }
        })
    } catch (error) {
        next(new AppError(ERROR_MESSAGE.SOMETHING_WENT_WRONG, 500))
    }
}

exports.userManageById = async(req,res,next)=>{
    try {
        const allUser = await User.findById(req.params.id)
        if(!allUser) {
            return next(new AppError(ERROR_MESSAGE.NOT_FOUND, 404))
        }
        res.status(200).json({
            status: STATUS.SUCCESS,
            message: RESPONCE_MESSAGE.SUCCESS,
            data: allUser
        })
    } catch (error) {
        next(new AppError(ERROR_MESSAGE.SOMETHING_WENT_WRONG, 500))
    }
}

exports.deleteUser = async(req,res,next)=>{
    try {
        const User = await User.findByIdAndDelete(req.params.id)
        if(!User) {
            return next(new AppError(ERROR_MESSAGE.NOT_FOUND, 404))
        }
        res.status(200).json({
            status: STATUS.SUCCESS,
            message: RESPONCE_MESSAGE.SUCCESS,
            data: null
        })
    } catch (error) {
        next(new AppError(ERROR_MESSAGE.SOMETHING_WENT_WRONG, 500))
    }
}
