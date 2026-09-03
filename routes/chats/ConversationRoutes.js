const conversation = require("../../controller/chat/ConversationController");
const express = require("express");
const router = express.Router();
const { AuthorizeUser } = require("../../middleware/auth");
const  asyncHandler = require('../../middleware/asyncWrapper');

// Get or create a conversation
// router.post("/CreateorGetconversations", AuthorizeUser("user" , "admin") ,asyncHandler(conversation.createOrGetConversation));

// Create a new message in a conversation
router.post("/CreateMessages", AuthorizeUser("user" , "admin") , asyncHandler(conversation.createMessage));

// Fetch all conversations for the sidebar
router.get("/GetAllConversations", AuthorizeUser("user" , "admin") ,asyncHandler(conversation.fetchConversationsForSidebar));

router.get("/GetAllConversationsAll", AuthorizeUser("user" , "admin") ,asyncHandler(conversation.fetchConversationsForSidebarOld));

// Fetch all messages for a specific conversation
router.get("/FetchAllMessages/:conversationId/messages", AuthorizeUser("user" , "admin") , asyncHandler(conversation.fetchMessagesByConversation));

// Fetch all messages for a specific conversation to the sidebar
router.get("/sidebar", AuthorizeUser("user" , "admin") ,asyncHandler(conversation.getChatParticipants));



module.exports = router;