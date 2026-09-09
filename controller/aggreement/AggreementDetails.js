const { dateValue, rentalState, serializeAgreement } = require("../../utils/rentalState");
const { currentAgreements } = require("../../services/rentalAvailability");
const { randomUUID } = require("crypto");
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
        const agreements = await Aggrement.find({ ownerId: req.user._id })
            .populate({ path: 'listingId', populate: { path: 'images' } })
            .populate('renterId', 'name imageUrl').populate('agreementDetailsId')
            .populate('blockChain').sort({ createdAt: -1 });
        res.json({ status: STATUS.SUCCESS, data: agreements.map(serializeAgreement) });
    } catch (error) { next(error); }
};

exports.CreateAggrement = async (req, res, next) => {
    let lock;
    let savedDetails;
    let savedAgreement;
    const { listingId, renterId, aggrementDetail, ownerConfirmed, conversationID } = req.body;
    try {
        const ownerId = req.user._id;
        if (!listingId || !renterId || !aggrementDetail || !conversationID) {
            return next(new AppError(false, ERROR_MESSAGE.MISSING_FIELDS, STATUS.BAD_REQUEST));
        }
        const start = dateValue(aggrementDetail.startDate);
        const end = dateValue(aggrementDetail.endDate, true);
        if (!start || !end || end < start || end < new Date()) {
            return next(new AppError(false, 'Choose valid rental dates. The end date must not be before the start date or today.', STATUS.BAD_REQUEST));
        }
        const listing = await RentalItem.findById(listingId);
        if (!listing) return next(new AppError(false, ERROR_MESSAGE.LISTING_NOT_FOUND, STATUS.NOT_FOUND));
        if (String(listing.owner) !== String(ownerId)) {
            return next(new AppError(false, ERROR_MESSAGE.NOT_LISTING_OWNER, STATUS.FORBIDDEN));
        }
        if (String(renterId) === String(ownerId)) {
            return next(new AppError(false, ERROR_MESSAGE.OwneAggrement, STATUS.BAD_REQUEST));
        }
        const conversation = await Conversation.findById(conversationID);
        if (!conversation || ![ownerId, renterId].every(id => conversation.participants.some(p => String(p) === String(id))) ||
            !conversation.listing.some(id => String(id) === String(listingId))) {
            return next(new AppError(false, 'Choose a listing and renter from this conversation.', STATUS.BAD_REQUEST));
        }
        // A short atomic lease serializes creation for this listing across API instances.
        const token = randomUUID();
        lock = await RentalItem.findOneAndUpdate({
            _id: listingId, owner: ownerId, listingStatus: 'active',
            $or: [{ 'agreementCreationLock.expiresAt': { $exists: false } },
                { 'agreementCreationLock.expiresAt': { $lt: new Date() } }]
        }, { $set: { agreementCreationLock: { token, expiresAt: new Date(Date.now() + 60000) } } }, { new: true });
        if (!lock) return next(new AppError(false, 'This listing is unavailable or an agreement is being created. Please refresh.', STATUS.CONFLICT));
        if ((await currentAgreements([listingId])).length) {
            return next(new AppError(false, 'This listing already has a current agreement.', STATUS.CONFLICT));
        }
        savedDetails = new AggrementDetails({ aggrementDetail });
        const agreement = new Aggrement({ listingId, ownerId, renterId, conversationID,
            agreementStatus: 'pending', ownerConfirmed: ownerConfirmed === true,
            renterConfirmed: false, agreementDetailsId: savedDetails._id });
        agreement.qrId = await QRCode.toDataURL(JSON.stringify(agreement._id));
        await savedDetails.save();
        await agreement.save();
        savedAgreement = agreement;
        res.status(STATUS.SUCCESS).json({ status: STATUS.SUCCESS, message: RESPONCE_MESSAGE.AGGREGEMENT_CREATED, data: agreement });
    } catch (error) {
        if (savedDetails && !savedAgreement) await AggrementDetails.deleteOne({ _id: savedDetails._id }).catch(() => {});
        next(error);
    } finally {
        if (lock) await RentalItem.updateOne({ _id: listingId, 'agreementCreationLock.token': lock.agreementCreationLock.token },
            { $unset: { agreementCreationLock: '' } }).catch(error => console.error('Agreement lock cleanup failed', error.message));
    }
};

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
        const { _id, message } = aggrementFromResponce;
        const agg = await Aggrement.findById(_id);
        if (agg && String(agg.ownerId) !== String(req.user._id)) {
            return next(new AppError(BOOLEAN.FALSE, 'Only the listing owner can send this agreement.', STATUS.FORBIDDEN));
        }
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
            agg.conversationID,
            true,
            next
        );

        
        
     

        if (io) {
            io.to(agg.conversationID.toString()).emit("receiveMessage", {
                conversationID: agg.conversationID,
                message:message,
                sender: agg.ownerId,
                receiver:agg.renterId,
                listing: agg.listingId,
              });
            io.to(agg.renterId.toString()).emit("messageNotification", {
                conversationId: agg.conversationID.toString(),
                receiver: agg.renterId.toString(),
                sender: agg.ownerId.toString(),
                message: messageLink,
            });
                   
        } else {
            return next(new AppError(BOOLEAN.FALSE, CONVERSATION.SOCKET_ERROR, STATUS.NOT_FOUND));
        }

       
        if(messageLink){
            await CreateNotification(
                agg.renterId,
                agg.ownerId,
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
        const canView = [agg.ownerId?._id || agg.ownerId, agg.renterId?._id || agg.renterId]
            .some(id => String(id) === String(req.user._id));
        if (!canView && req.user.role !== ROLES.ADMIN) {
            return next(new AppError(BOOLEAN.FALSE, 'You do not have access to this agreement.', STATUS.FORBIDDEN));
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
        const { aggId, renterConfirmed } = req.body;
        const agreement = await Aggrement.findById(aggId).populate('agreementDetailsId');
        if (!agreement) return next(new AppError(false, 'Agreement not found.', STATUS.NOT_FOUND));
        if (String(agreement.renterId) !== String(req.user._id)) {
            return next(new AppError(false, 'Only the renter can confirm this agreement.', STATUS.FORBIDDEN));
        }
        if (['completed', 'rejected'].includes(rentalState(agreement))) {
            return next(new AppError(false, 'This agreement has ended and cannot be confirmed.', STATUS.CONFLICT));
        }
        if (!agreement.ownerConfirmed || renterConfirmed !== true) {
            return next(new AppError(false, 'Both owner and renter must confirm the agreement.', STATUS.BAD_REQUEST));
        }
        const wasConfirmed = agreement.renterConfirmed;
        agreement.renterConfirmed = true;
        agreement.agreementStatus = rentalState(agreement) === 'rented' ? 'active' : 'pending';
        await agreement.save();
        if (!wasConfirmed) await CreateNotification(agreement.ownerId, req.user._id, 'aggreement',
            'Your renter has confirmed the rental agreement.', error => console.error(error.message));
        res.json({ status: STATUS.SUCCESS, message: 'Agreement confirmed.', data: serializeAgreement(agreement) });
    } catch (error) { next(error); }
};

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

        if (String(user) !== String(agg.ownerId)) {
            return next(new AppError(false, AGGREEMENT.AGGREMENT_NOT_OWNER, STATUS.FORBIDDEN));
        }
        if (['completed', 'rejected'].includes(rentalState(agg))) {
            return next(new AppError(false, 'An ended agreement cannot be edited. Create a new agreement instead.', STATUS.CONFLICT));
        }
        const agreementDetails = await AggrementDetails.findById(agg.agreementDetailsId);
        if (!agreementDetails) {
            return next(new AppError(BOOLEAN.FALSE, ERROR_MESSAGE.AGGREMENT_DETAILS_NOT_FOUND, STATUS.NOT_FOUND));
        }

        if (agg.ownerConfirmed === BOOLEAN.TRUE && agg.renterConfirmed === BOOLEAN.FALSE) {
            const merged = { ...agreementDetails.aggrementDetail, ...aggrementDetail };
            const start = dateValue(merged.startDate);
            const end = dateValue(merged.endDate, true);
            if (!start || !end || end < start || end < new Date()) {
                return next(new AppError(false, 'Choose valid rental start and end dates.', STATUS.BAD_REQUEST));
            }
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
