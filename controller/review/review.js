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





exports.ToGetReview = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const agreements = await Aggrement.find({
      $or: [{ ownerId: userId }, { renterId: userId }],
      ownerConfirmed: BOOLEAN.TRUE, 
      renterConfirmed: BOOLEAN.TRUE
    })
      .populate("listingId")
      .populate("ownerId")
      .populate("renterId")
      .exec();

    const counterparts = await Promise.all(
      agreements.map(async (agreement) => {
        const isOwner = agreement.ownerId._id.toString() === userId.toString();
        const counterpartUser = isOwner ? agreement.renterId : agreement.ownerId;

        const listing = await RentalItem.findById(agreement.listingId._id)
          .populate("images")
          .populate("videos");

        return {
          agreementId: agreement._id,
          listing, 
          user: {
            id: counterpartUser._id,
            name: counterpartUser.name,
            email: counterpartUser.email,
            imageUrl: counterpartUser.imageUrl,
          },
          agreementStatus: agreement.agreementStatus,
          blockchainStatus: agreement.blockchainStatus,
          ownerConfirmed: agreement.ownerConfirmed,
          renterConfirmed: agreement.renterConfirmed,
          agreementDate: agreement.agreementDate,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "To be given review users fetched successfully",
      data: counterparts,
    });

  } catch (error) {
   next(error)
  }
};
