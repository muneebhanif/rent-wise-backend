const Aggrement = require("../../../model/agreements/Aggrement");
const AggrementDetails = require("../../../model/agreements/AggrementDetails");
const RentalItem = require("../../../model/listings/RentalItemModel");
const BlockChainAggrement = require("../../../model/agreements/BlockChainAggrements");
const Listings = require("../../../model/listings/RentalItemModel")
const logger = require("../../../utils/logger");
const { ERROR_MESSAGE } = require("../../../messages/error");
const {
    RESPONCE_MESSAGE,
    AGGREEMENT,
    CONVERSATION,
} = require("../../../messages/response");
const { STATUS } = require("../../../messages/status");
const AppError = require("../../../utils/AppError");
const { ROLES, BOOLEAN } = require("../../../utils/Roles");
const QRCode = require("qrcode");
const { io } = require("../../../utils/socket");
const Messsage = require("../../../model/chat/MesssageModel");
const Conversation = require("../../../model/chat/ConversationModel");
const {CreateNotification} = require("../../notification/notification")

exports.getAllLists = async(req,res,next)=>{
    try {
        const allLists = await Listings.find().populate('owner location images videos facilities')
        const cars = await Listings.find({ category: "car" }).populate('owner location images videos facilities')
        const houses = await Listings.find({ category: "house" }).populate('owner location images videos facilities')
        const hostels = await Listings.find({ category: "hostel" }).populate('owner location images videos facilities')

        res.status(200).json({
            status: STATUS.SUCCESS,
            message: RESPONCE_MESSAGE.SUCCESS,
            data: {
                allLists,
                cars,
                houses,
                hostels
            }
        })
    } catch (error) {
        next(new AppError(ERROR_MESSAGE.SOMETHING_WENT_WRONG, 500))
    }
}

exports.getListingById = async(req,res,next)=>{
    try {
        const listing = await Listings.findById(req.params.id).populate('owner location images videos facilities')
        if(!listing) {
            return next(new AppError(ERROR_MESSAGE.NOT_FOUND, 404))
        }
        res.status(200).json({
            status: STATUS.SUCCESS,
            message: RESPONCE_MESSAGE.SUCCESS,
            data: listing
        })
    } catch (error) {
        next(new AppError(ERROR_MESSAGE.SOMETHING_WENT_WRONG, 500))
    }
}

exports.deleteListing = async(req,res,next)=>{
    try {
        const listing = await Listings.findByIdAndDelete(req.params.id)
        if(!listing) {
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