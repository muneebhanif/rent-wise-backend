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
const {CreateNotification} = require("../../controller/notification/notification")
const User = require("../../model/user/userModel");


const CreateQrCode = async (data, next) => {
    try {
        const QrData = JSON.stringify(data);
        const qrCode = await QRCode.toDataURL(QrData);
        return qrCode;
    } catch (error) {
        next(error);
    }
}


exports.getByOwnerId = async (req, res, next) => {
    try {
        const ownerId = req.user.id;
        const agreements = await Aggrement.find({ ownerId })
            .populate("listingId")
            .populate("renterId")
            .populate("agreementDetailsId")
            .populate("blockChain");

        if (!agreements?.length) {
                    return res.status(STATUS.SUCCESS).json({
                        status: BOOLEAN.TRUE,
                        message: AGGREEMENT.AGGREMENT_NOT_EXISTED,
                        data: []
                    });        }

        for (const agreement of agreements) {
            const aggDetails = await AggrementDetails.findById(agreement.agreementDetailsId);
            const { startDate, endDate } = aggDetails.aggrementDetail;
            
            const currentDate = new Date();
            const agreementStart = new Date(startDate);
            const agreementEnd = new Date(endDate);
            const originalStatus = agreement.agreementStatus;

            let newStatus;
            
            if (!agreement.renterConfirmed) {
                newStatus = currentDate > agreementEnd ? "Inactive" 
                    : (currentDate >= agreementStart ? "pending" : originalStatus);
            } else {
                newStatus = currentDate > agreementEnd ? "Inactive" 
                    : currentDate >= agreementStart ? "active" 
                    : currentDate < agreementStart ? "pending" 
                    : originalStatus;
            }

            if (newStatus !== originalStatus) {
                const updatedAgreement = await Aggrement.findByIdAndUpdate(
                    agreement._id,
                    { agreementStatus: newStatus },
                    { new: true }
                );

                await CreateNotification(
                    agreement.ownerId._id,
                    null,
                    "aggrement",
                    `Agreement status changed to ${newStatus} for ${agreement.listingId.title}`,
                    next,
                    res
                );

                await CreateNotification(
                    agreement.renterId._id,
                    null,
                    "aggrement",
                    `Agreement status changed to ${newStatus} for ${agreement.listingId.title}`,
                    next,
                    res
                );
            }
        }

        res.status(STATUS.SUCCESS).json({
            status: STATUS.SUCCESS,
            message: RESPONCE_MESSAGE.AGGREGEMENT_CREATED,
            data: agreements,
        });
    } catch (error) {
        next(error);
    }
};

exports.CreateAggrement = async (req, res, next) => {
    try {
        const { listingId, renterId, aggrementDetail, ownerConfirmed, conversationID } = req.body;
        const ownerId = req.user._id;

        if (!ownerId) {
            return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.USER_NOT_FOUND, STATUS.NOT_FOUND));
        }

        if (!listingId || !renterId || !aggrementDetail) {
            return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.MISSING_FIELDS, STATUS.BAD_REQUEST));
        }

        const listing = await RentalItem.findById(listingId);
        if (!listing) {
            return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.LISTING_NOT_FOUND, STATUS.NOT_FOUND));
        }

        if (listing.owner.toString() !== ownerId.toString()) {
            return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.NOT_LISTING_OWNER, STATUS.UNAUTHORIZED));
        }

        if (renterId.toString() === ownerId.toString()) {
            return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.OwneAggrement, STATUS.BAD_REQUEST));
        }

        const existingAgreement = await Aggrement.findOne({
            listingId: listingId,
            renterId: renterId,
            $or: [{ agreementStatus: "pending" }, { agreementStatus: "active" }]
        });


        if (existingAgreement) {
            return res.status(STATUS.FORBIDDEN).json({
                status: STATUS.FORBIDDEN,
                message: AGGREEMENT.AGGREMENT_ALREADY_EXISTS
            });
        }
        const aggrementDetails = new AggrementDetails({
            aggrementDetail: aggrementDetail
        })
        await aggrementDetails.save();

        const agg = new Aggrement({
            listingId: listingId,
            ownerId: ownerId,
            renterId: renterId,
            conversationID: conversationID,
            agreementStatus: "pending",
            ownerConfirmed: ownerConfirmed || false,
            renterConfirmed: false,
            agreementDetailsId: aggrementDetails._id,
        })

        const qrCode = await CreateQrCode(agg._id);
        agg.qrId = qrCode;

        await agg.save();
        res.status(STATUS.SUCCESS).json({
            status: STATUS.SUCCESS,
            message: RESPONCE_MESSAGE.AGGREGEMENT_CREATED,
            data: agg,
        })
    } catch (error) {
        next(error);
    }
}

exports.verifyAggrement = async (req, res, next) => {
    try {
        const { aggId } = req.params;
        const agg = await Aggrement.findById(aggId);
        if (!agg) {
            return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.USER_NOT_FOUND, STATUS.NOT_FOUND));
        }
        const { renterConfirmed } = req.body;
        if (renterConfirmed == BOOLEAN.TRUE) {
            agg.renterConfirmed = renterConfirmed;
            await agg.save();
        }
    } catch (error) {
        next(error);
    }
}




const createLinkMessage = async (listingId, message, senderId, receiver, conversationID, isLinkMessage, next) => {
    try {
        const conversation = await Conversation.findById(conversationID);
        if (!conversation) {
            return next(new AppError(BOOLEAN.FALSE, CONVERSATION.CONVERSATION_NOT_FOUND, STATUS.NOT_FOUND));
        }

        const newMessage = new Messsage({
            sender: senderId,
            receiver,
            conversation: conversationID,
            listing: listingId,
            message,
            status: "sent",
            type: "link",
        });


        await newMessage.save();


        conversation.updatedAt = new Date();
        await conversation.save();

      

        return newMessage;
    } catch (err) {
        next(err);
    }
};


exports.sentAggreement = async (req, res, next) => {
    try {
        const { aggrementFromResponce } = req.body;
        if (!aggrementFromResponce) {
            return next(new AppError(BOOLEAN.FALSE, AGGREEMENT.AGGREMENT_FROM_REQUEST, STATUS.BAD_REQUEST));
        }
        const { _id, conversationID, renterId, ownerId, listingId , message } = aggrementFromResponce;
        const agg = await Aggrement.findById(_id);
        if (!agg) {
            return next(new AppError(BOOLEAN.FALSE, AGGREEMENT.AGGREMENT_NOT_FOUND, STATUS.NOT_FOUND));
        }



        const aggDetails = await AggrementDetails.findById(agg.agreementDetailsId);
        if (!aggDetails) {
            return next(new AppError(BOOLEAN.FALSE, AGGREEMENT.AGGREMENT_NOT_FOUND, STATUS.NOT_FOUND));
        }


        const listingTitle = await RentalItem.findById(agg.listingId).select('title')

        if (agg.ownerConfirmed === BOOLEAN.FALSE) {
            return res.status(STATUS.FORBIDDEN).json({
                status: STATUS.FORBIDDEN,
                message: AGGREEMENT.AFFGEMENT_NOT_CONFIRMED_BY_OWNER,
            });
        }

        const messageLink = await createLinkMessage(
            agg.listingId,
            message,
            agg.ownerId,
            agg.renterId,
            conversationID,
            true,
            next
        );

        
        
     

        if (io) {
            io.to(conversationID.toString()).emit("receiveMessage", {
                conversationID,
                message:message,
                sender: agg.ownerId,
                receiver:agg.renterId,
                listing: listingId,
              });
                   
        } else {
            return next(new AppError(BOOLEAN.FALSE, CONVERSATION.SOCKET_ERROR, STATUS.NOT_FOUND));
        }

       
        if(messageLink){
            await CreateNotification(
                agg.ownerId,
                agg.renterId,
                "aggreement",
                `You have received a new agreement for ${listingTitle.title} from the owner. Please review and confirm`,
                next,
                res
            );
        }

        res.status(200).json({
            success: true,
            message: "Agreement notification sent successfully",
            data: messageLink,
        });
    } catch (error) {
        next(error);
    }
};



//owner should true to sent



exports.GetByAggrementId = async (req, res, next) => {
    try {
        const { aggId } = req.body;

        const agg = await Aggrement.findById(aggId).populate('agreementDetailsId').populate("renterId").populate("listingId").populate("ownerId");

        if (!agg) {
            return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.AGGREMENT_NOT_FOUND, STATUS.NOT_FOUND));
        }
        res.status(STATUS.SUCCESS).json({
            status: STATUS.SUCCESS,
            message: AGGREEMENT.AGGREMENT_FECTHED_BY_ID,
            data: agg,
        })
    } catch (error) {
        next(error);
    }
}





exports.GetAggrementByQr = async (req, res, next) => { }





// To View the aggrement Only for The Renter and Update the Aggrement For Owner To Make the Aggrement As Complete
exports.VerifyAggrementByRenter = async (req, res, next) => {
    try {
        const user = req.user._id;
        const { aggId, renterConfirmed } = req.body;

        const aggrement = await Aggrement.findById(aggId).populate('agreementDetailsId');
        if (!aggrement) {
            return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.AGGREMENT_NOT_FOUND, STATUS.NOT_FOUND));
        }

         const userName = await User.findById(user).select('name')
         const listingTitle = await RentalItem.findById(aggrement.listingId).select('title')
        const ownerId = aggrement.ownerId;
        if (aggrement.ownerConfirmed === BOOLEAN.TRUE && aggrement.renterConfirmed === BOOLEAN.TRUE) {
            return res.status(STATUS.SUCCESS).json({
                status: STATUS.FORBIDDEN,
                message: AGGREEMENT.AGGREMENT_IS_ALREADY_CONFIRMED_ACTIVE,
            })
        }
        if (aggrement.ownerConfirmed === BOOLEAN.FALSE) {
            return res.status(STATUS.SUCCESS).json({
                status: STATUS.UNAUTHORIZED,
                message: AGGREEMENT.AFFGEMENT_NOT_CONFIRMED_BY_OWNER,
            })
        }
        if (user.toString() !== aggrement.renterId.toString()) {
            return res.status(STATUS.SUCCESS).json({
                status: STATUS.UNAUTHORIZED,
                message: AGGREEMENT.AFFGEMENT_CAN_ONLY_BE_CONFIRMED_BY_RENTER,
            })
        }
        if (renterConfirmed === BOOLEAN.TRUE && aggrement.renterConfirmed === BOOLEAN.FALSE && user.toString() === aggrement.renterId.toString()) {
            const agg = await Aggrement.findByIdAndUpdate(aggId, { renterConfirmed: BOOLEAN.TRUE, agreementStatus: "active" }, { new: true });
            if(agg){
                await CreateNotification(
                    agg.renterId,
                    agg.ownerId,
                    "aggreement",
                    `${userName.name} has Confirmed the agreement for ${listingTitle.title}.`,
                    next,
                    res
                );
            }
    
            return res.status(STATUS.SUCCESS).json({
                status: STATUS.SUCCESS,
                message: AGGREEMENT.AGGREMENT_IS_CONFIRMED,
            })
        }
        else {
            const agg = await Aggrement.findByIdAndUpdate(aggId, { renterConfirmed: BOOLEAN.TRUE, agreementStatus: "pending" }, { new: true });
            return res.status(STATUS.BAD_REQUEST).json({
                status: STATUS.BAD_REQUEST,
                message: AGGREEMENT.AGGREMENT_IS_NOT_CONFIRMED,
            })
        }
    } catch (err) {
        next(err);
    }
}




exports.UpdateAggrementByOwner = async (req, res, next) => {
    try {
        const { aggId, data, aggrementDetail } = req.body;
        const user = req.user._id;


        const agg = await Aggrement.findById(aggId)
            .populate("agreementDetailsId")
            .populate("listingId", "category owner");

        if (!agg) {
            return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.AGGREMENT_NOT_FOUND, STATUS.NOT_FOUND));
        }

        if (user.toString() !== agg.ownerId.toString()) {
            return res.status(STATUS.SUCCESS).json({
                status: STATUS.SUCCESS,
                message: AGGREEMENT.AGGREMENT_NOT_OWNER,
                data: agg,
            });
        }

        const agreementDetails = await AggrementDetails.findById(agg.agreementDetailsId);
        if (!agreementDetails) {
            return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.AGGREMENT_DETAILS_NOT_FOUND, STATUS.NOT_FOUND));
        }

        if (agg.ownerConfirmed === BOOLEAN.TRUE && agg.renterConfirmed === BOOLEAN.FALSE) {
            const updatedDetailsofaggrement = await AggrementDetails.findByIdAndUpdate(
                agg.agreementDetailsId,
                {
                    "aggrementDetail": {
                        ...agreementDetails.aggrementDetail,
                        ...aggrementDetail
                    }
                },
                { new: true }
            );

            if (!updatedDetailsofaggrement) {
                return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.AGGREMENT_DETAILS_NOT_UPDATED, STATUS.NOT_FOUND));
            }

            return res.status(STATUS.SUCCESS).json({
                status: STATUS.SUCCESS,
                message: AGGREEMENT.AGGREMENT_IS_CONFIRMED_BY_OWNER,
                data: updatedDetailsofaggrement,
            });
        } else {
            return res.status(STATUS.BAD_REQUEST).json({
                status: STATUS.BAD_REQUEST,
                message: AGGREEMENT.CANNOT_UPDATE_AGREEMENT_RENTER_AGGREED_TO_IT,
            });
        }

    } catch (err) {
        next(err);
    }
}