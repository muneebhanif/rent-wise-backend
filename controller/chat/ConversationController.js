const { annotateListings } = require("../../services/rentalAvailability");
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

    if (typeof message !== "string" || !message.trim() || message.length > 5000 || !listing || !senderId || !receiver || String(senderId) === String(receiver)) {
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

      io.to(receiver.toString()).emit("messageNotification", {
        conversationId: conversationId.toString(),
        receiver: receiver.toString(),
        sender: senderId.toString(),
        message: newMessage,
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
      

    }
    res.status(STATUS.SUCCESS).json({
      success: BOOLEAN.TRUE, message: CONVERSATION.MESSAGE_SENT, data: newMessage,
    });
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
      .populate("listing", "title image category owner");

    if (!conversations.length) {
      return next(
        new AppError(
          BOOLEAN.FALSE,
          CONVERSATION.CONVERSATION_NOT_FOUND,
          STATUS.NOT_FOUND
        )
      );
    }

    const enrichedListings = await annotateListings(conversations.flatMap(item => item.listing || []));
    const listingMap = new Map(enrichedListings.map(item => [String(item._id), item]));
    const latestMessages = await Messsage.aggregate([
      { $match: { conversation: { $in: conversations.map(item => item._id) } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$conversation', message: { $first: '$message' }, createdAt: { $first: '$createdAt' } } }
    ]);
    const messageMap = new Map(latestMessages.map(item => [String(item._id), item]));
    const data = conversations.map(item => ({ ...item,
      listing: (item.listing || []).map(list => listingMap.get(String(list._id)) || list),
      lastMessage: messageMap.get(String(item._id)) || null
    })).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.status(STATUS.SUCCESS).json({ success: BOOLEAN.TRUE, data });
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
      {
        $lookup: {
          from: "messsages",
          let: { conversationId: "$_id", currentUser: new mongoose.Types.ObjectId(userId) },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$conversation", "$$conversationId"] },
                    { $eq: ["$receiver", "$$currentUser"] },
                    { $eq: ["$status", "sent"] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "unreadMessages",
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
          // Keep the looked-up listing array intact. The previous nested
          // object syntax produced a literal object instead of projecting the
          // array, which meant the client could not discover an owner's
          // available listing and hid the Create agreement action.
          listing: 1,
          createdAt: 1,
          updatedAt: 1,
          unreadMessages: 1,
        },
      },
      {
        $group: {
          _id: "$_id",
          participants: { $push: "$user" },
          listing: { $first: "$listing" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          unreadMessagesCount: { $first: { $ifNull: [{ $arrayElemAt: ["$unreadMessages.count", 0] }, 0] } },
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

    const enrichedListings = await annotateListings(conversations.flatMap(item => item.listing || []));
    const listingMap = new Map(enrichedListings.map(item => [String(item._id), item]));
    const latestMessages = await Messsage.aggregate([
      { $match: { conversation: { $in: conversations.map(item => item._id) } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$conversation', message: { $first: '$message' }, createdAt: { $first: '$createdAt' } } }
    ]);
    const messageMap = new Map(latestMessages.map(item => [String(item._id), item]));
    const data = conversations.map(item => ({ ...item,
      listing: (item.listing || []).map(list => listingMap.get(String(list._id)) || list),
      lastMessage: messageMap.get(String(item._id)) || null
    })).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.status(STATUS.SUCCESS).json({ success: BOOLEAN.TRUE, data });
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

    if (!conversation.participants.some(id => String(id) === String(userId))) {
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
      .populate("listing", "title image category owner");

    await Messsage.updateMany(
      { conversation: conversationId, receiver: userId, status: "sent" },
      { $set: { status: "read", updatedAt: new Date() } }
    );
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
