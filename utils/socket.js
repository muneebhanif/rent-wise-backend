const express = require("express");
const app = express();
const http = require("http");
const socketIo = require("socket.io");
const server = http.createServer(app);
const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:4000"].filter(Boolean);
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true 
  }
});
const connectedUsers = []
io.on("connection", (socket) => {
    socket.on("join-user", (userId) => {
      socket.join(userId.toString());
      if (!connectedUsers.some((id) => id === userId)) {
        connectedUsers.push(userId); 
      }
  });
    socket.on("join-conversation", (conversationId) => {
        socket.join(conversationId);
    });
  socket.on("leave-conversation", (conversationId) => {
    socket.leave(conversationId);
  });
  socket.on("leave-user", (userId) => {
    const index = connectedUsers.indexOf(userId);
  if (index !== -1) {
    connectedUsers.splice(index, 1);
  }
    socket.leave(userId);
  });
    socket.on("disconnect", () => {
    });
});


module.exports = { server, io, app , connectedUsers };
