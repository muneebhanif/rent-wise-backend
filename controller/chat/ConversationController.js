const mongoose = require("mongoose");
const Conversation = require("../../model/chat/ConversationModel");
const Messsage = require("../../model/chat/MesssageModel");
const { CONVERSATION } = require("../../messages/response");
const { STATUS } = require("../../messages/status");
const { io } = require("../../utils/socket");
const AppError = require("../../utils/AppError");
const { ROLES, BOOLEAN } = require("../../utils/Roles");
const { CreateNotification } = require("../../controller/notification/notification")
const {connectedUsers  , onlineUsers} = require("../../utils/socket")



const getChatParticipants = async (req, res) => {
  try {
    const userId = req.user._id;

    const participants = await Conversation.aggregate([
      {
        $match: {
          participants: new mongoose.Types.ObjectId(userId),
        },
      },
      { $unwind: "$participants" },
      {
        $match: {
          participants: { $ne: new mongoose.Types.ObjectId(userId) },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "participants",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          user: {
            _id: 1,
            name: 1,
            email: 1,
            imageUrl: 1,
          },
        },
      },
    ]);

    if (!participants) {
      return next(
        new AppError(
          BOOLEAN.FALSE,
          CONVERSATION.PARTICIPANTS_NOT_FOUND,
          STATUS.NOT_FOUND
        )
      );
    }

    res.status(STATUS.SUCCESS).json({ success: BOOLEAN.TRUE, participants });
  } catch (error) {
    next(error);
  }
};

const createOrGetConversations = async (receiver, listing, senderId, next) => {
  try {
    if (!senderId || !receiver || !listing) {
      return next(
        new AppError(
          BOOLEAN.FALSE,
          CONVERSATION.INVALID_DATA,
          STATUS.BAD_REQUEST
        )
      );
    }

    const listingArray = Array.isArray(listing) ? listing : [listing];

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiver] },
    });

    let isNewConversation = false;

    if (!conversation) {
      isNewConversation = true;
      conversation = new Conversation({
        participants: [senderId, receiver],
        listing: listingArray,
      });
      await conversation.save();
    } else {
      const newListings = listingArray.filter(
        (listId) => !conversation.listing.includes(listId)
      );
      if (newListings.length > 0) {
        conversation.listing.push(...newListings);
        await conversation.save();
      }
    }

    const participants = await Conversation.aggregate([
      { $match: { _id: conversation._id } },
      { $unwind: "$participants" },
      {
        $lookup: {
          from: "users",
          localField: "participants",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          user: {
            _id: 1,
            name: 1,
            email: 1,
            imageUrl: 1,
          },
        },
      },
    ]);

    if (!participants) {
      return next(
        new AppError(
          BOOLEAN.FALSE,
          CONVERSATION.PARTICIPANTS_NOT_FOUND,
          STATUS.NOT_FOUND
        )
      );
    }

    return {
      conversation,
      participants: participants.map((p) => p.user),
      isNewConversation
    };
  } catch (error) {
    next(error);
  }
};

const createMessage = async (req, res, next) => {
  try {
    const { message, listing  , receiverPath} = req.body;
    const senderId = req.user._id;
    const receiver = req.body.receiver;

    if (!message || !listing || !senderId || !receiver) {
      return next(
        new AppError(
          BOOLEAN.FALSE,
          CONVERSATION.INVALID_DATA,
          STATUS.BAD_REQUEST
        )
      );
    }

    const listingArray = Array.isArray(listing) ? listing : [listing];

    const newMessage = new Messsage({
      sender: senderId,
      receiver,
      listing: listingArray,
      message,
      status: "sent",
      type: "text",
    });

    const conversationResult = await createOrGetConversations(
      receiver,
      listingArray,
      senderId,
      next
    );

    if (!conversationResult) {
      return next(
        new AppError(
          BOOLEAN.FALSE,
          CONVERSATION.CONVERSATION_NOT_FOUND,
          STATUS.NOT_FOUND
        )
      );
    }

    const conversationId = conversationResult.conversation._id;
    newMessage.conversation = conversationId;
    await newMessage.save();

    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      conversation.updatedAt = new Date();
      await conversation.save();
    }

    if (io) {
      io.to(conversationId.toString()).emit("receiveMessage", {
        conversationId,
        message,
        sender: senderId,
        receiver,
        listing: listingArray,
      });

      if (conversationResult.isNewConversation) {
        io.to(receiver.toString()).emit("newConversation", {
          conversation: conversationResult.conversation,
          participants: conversationResult.participants,
          lastMessage: newMessage,
          unreadCount: 1
        });
      }

      if (!connectedUsers.includes(receiver.toString())) {
        await CreateNotification(receiver, senderId, 'chat', 'You have received a new message', next);
        if (conversationResult.isNewConversation) {
          await CreateNotification(receiver, senderId, 'chat', 'Someone started a conversation with you', next);
        }
      }
      

      res.status(STATUS.SUCCESS).json({
        success: BOOLEAN.TRUE,
        message: CONVERSATION.MESSAGE_SENT,
        data: newMessage,
      });
    }
  } catch (error) {

    next(error);
  }


}



const fetchConversationsForSidebarOld = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .sort({ updatedAt: -1 })
      .populate("participants", "name imageUrl")
      .populate("listing", "title image");

    if (!conversations.length) {
      return next(
        new AppError(
          BOOLEAN.FALSE,
          CONVERSATION.CONVERSATION_NOT_FOUND,
          STATUS.NOT_FOUND
        )
      );
    }

    res
      .status(STATUS.SUCCESS)
      .json({ success: BOOLEAN.TRUE, data: conversations });
  } catch (error) {
    next(error);
  }
};

const fetchConversationsForSidebar = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.aggregate([
      {
        $match: {
          participants: new mongoose.Types.ObjectId(userId),
        },
      },
      { $unwind: "$participants" },
      {
        $match: {
          participants: { $ne: new mongoose.Types.ObjectId(userId) },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "participants",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "rentalitems",
          localField: "listing",
          foreignField: "_id",
          as: "listing",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          user: {
            _id: 1,
            name: 1,
            email: 1,
            imageUrl: 1,
          },
          listing: {
            _id: 1,
            title: 1,
            image: 1,
            category: 1,
          },
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $group: {
          _id: "$_id",
          participants: { $push: "$user" },
          listing: { $first: "$listing" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
        },
      },
    ]);
    if (!conversations) {
      return next(
        new AppError(
          BOOLEAN.FALSE,
          CONVERSATION.CONVERSATION_NOT_FOUND,
          STATUS.NOT_FOUND
        )
      );
    }

    res
      .status(STATUS.SUCCESS)
      .json({ success: BOOLEAN.TRUE, data: conversations });
  } catch (error) {
    next(error);
  }
};

const fetchMessagesByConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    if (!conversationId) {
      return res
        .status(STATUS.BAD_REQUEST)
        .json({ message: CONVERSATION.CONVERSTAION_ID_REQUIRED });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return next(
        new AppError(
          BOOLEAN.FALSE,
          CONVERSATION.CONVERSATION_NOT_FOUND,
          STATUS.NOT_FOUND
        )
      );
    }

    if (!conversation.participants.includes(userId)) {
      return next(
        new AppError(
          BOOLEAN.FALSE,
          CONVERSATION.CONVERSATION_NOT_FOUND,
          STATUS.NOT_FOUND
        )
      );
    }

    const messages = await Messsage.find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .populate("sender", "name imageUrl")
      .populate("receiver", "name imageUrl")
      .populate("listing", "title image");
    if (io) {
      io.emit("joinRoom", conversationId.toString());
    } else {
      return next(
        new AppError(
          BOOLEAN.FALSE,
          CONVERSATION.SOCKET_ERROR,
          STATUS.BAD_REQUEST
        )
      );
    }

    res.status(STATUS.SUCCESS).json({
      success: BOOLEAN.TRUE,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMessage,
  fetchConversationsForSidebar,
  fetchConversationsForSidebarOld,
  fetchMessagesByConversation,
  getChatParticipants,
};
