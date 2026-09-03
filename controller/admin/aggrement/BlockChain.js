const Aggrement = require("../../../model/agreements/Aggrement");
const AggrementDetails = require("../../../model/agreements/AggrementDetails");
const RentalItem = require("../../../model/listings/RentalItemModel");
const BlockChainAggrement = require("../../../model/agreements/BlockChainAggrements");
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

// const BlockChainAggrement = require("../../model/agreements/BlockChainAggrements");

exports.getAggrementForAdminByOwnerIDs = async (req, res, next) => {
    try {
        const agreements = await Aggrement.find(
            { blockchainStatus: false },
            { _id: 1, blockchainStatus: 1 , ownerConfirmed:1 }
        );

        if (!agreements) {
            res.status(STATUS.NOT_FOUND).json({
                status: STATUS.BAD_REQUEST,
                message: AGGREEMENT.AGGREMENT_NOT_FOUND,
            });
            return next(
                new AppError(
                    BOOLEAN.FALSE,
                    AGGREEMENT.AGGREMENT_NOT_FOUND,
                    STATUS.NOT_FOUND
                )
            );
        }

        const confirmedAgreements = agreements.filter(agreement => 
            agreement.ownerConfirmed === BOOLEAN.TRUE
        );
        if (confirmedAgreements.length > 0) {
            res.status(STATUS.SUCCESS).json({
                status: STATUS.SUCCESS,
                message: AGGREEMENT.AGGREMENT_FETCHED_THAT_ARE_NOT_BLOCKCHAINED,
                data: agreements,
            });
        } else {
            res.status(STATUS.FORBIDDEN).json({
                status: BOOLEAN.FALSE,
                message: AGGREEMENT.AGGREMENT_NOT_AVAILABLE_BLOCKCAHIN,
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.MakeAggrementForAdminByOwnerIDs = async (req, res, next) => {
    try {
        const { agreementId, transactionHash } = req.body;
        const blockChainAgreement = await BlockChainAggrement.create({
            agreementId: agreementId,
            transactionHash: transactionHash,
            blockchainStatus: "active",
        });

        const agreement = await Aggrement.findByIdAndUpdate(
            agreementId,
            {
                blockChain: blockChainAgreement._id,
                blockchainStatus: true,
            },
            { new: true }
        );

        if (!blockChainAgreement || !agreement) {
            return next(
                new AppError(false, "Failed to create blockchain agreement", 400)
            );
        }

        res.status(200).json({
            status: "success",
            message: "Blockchain agreement created successfully",
            data: blockChainAgreement,
        });
    } catch (error) {
        next(error);
    }
};
