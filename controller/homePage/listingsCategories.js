const Aggrement = require("../../model/agreements/Aggrement");
const listings = require("../../model/listings/RentalItemModel")
const AggrementDetails = require("../../model/agreements/AggrementDetails");
const RentalItem = require("../../model/listings/RentalItemModel");
const { ERROR_MESSAGE } = require("../../messages/error");
const { RESPONCE_MESSAGE, AGGREEMENT, CONVERSATION, LISTINGS } = require("../../messages/response");
const { STATUS } = require("../../messages/status");
const AppError = require("../../utils/AppError");
const { ROLES, BOOLEAN } = require("../../utils/Roles");
const QRCode = require('qrcode')
const { io } = require("../../utils/socket");



exports.getAllCarsListings = async (req, res, next) => {
    try {
        const CarListings = await listings.find({
            category: "car"
        })
        .populate("images")
        .populate("videos")
        .populate('location')

        res.status(STATUS.SUCCESS).json({
            status: STATUS.SUCCESS,
            message: LISTINGS.CAR_LISTING_FETCHED,
            data: CarListings,
        })

    } catch (error) {
        next(error)

    }
}
exports.getAllHouseListings = async (req, res, next) => {
    try {
        const HouseListings = await listings.find({
            category: "house"
        })
        .populate("images")
        .populate("videos")
        .populate('facilities')
        .populate('location')

        res.status(STATUS.SUCCESS).json({
            status: STATUS.SUCCESS,
            message: LISTINGS.HOUSE_LISTING_FETCHED,
            data: HouseListings,
        })

    } catch (error) {
        next(error)


    }
}
exports.getAllHostelListings = async (req, res, next) => {
    try {

        const HostelListings = await listings.find({
            category: "hostel"   
        })
        .populate("images")
        .populate("videos")
        .populate('facilities')
        .populate('location')

        res.status(STATUS.SUCCESS).json({
            status: STATUS.SUCCESS,
            message: LISTINGS.Hostel_LISTING_FETCHED,
            data: HostelListings,
        })
    } catch (error) {
        next(error)


    }
}