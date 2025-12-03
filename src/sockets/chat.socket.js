const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const User = require("../models/User");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "https://chat-app-client-chi-three.vercel.app",
      methods: ["GET", "POST"]
    }
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Fetch full user object to have username/email
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error("User not found"));
      }
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.user.id);

    // Add to online users
    onlineUsers.set(socket.user.id.toString(), {
      _id: socket.user._id,
      username: socket.user.username,
      email: socket.user.email
    });
    io.emit("online_users", Array.from(onlineUsers.values()));

    // Join a channel
    socket.on("join_channel", (channelId) => {
      socket.join(channelId);
      console.log(`User ${socket.user.id} joined channel ${channelId}`);
    });

    // Leave a channel
    socket.on("leave_channel", (channelId) => {
      socket.leave(channelId);
      console.log(`User ${socket.user.id} left channel ${channelId}`);
    });

    // Send message
    socket.on("send_message", async (data) => {
      try {
        const { channelId, content } = data;

        // Save to database
        const newMessage = new Message({
          channel: channelId,
          sender: socket.user.id,
          content
        });
        await newMessage.save();

        // Populate sender info for the frontend
        await newMessage.populate('sender', 'username email');

        // Broadcast to the channel
        io.to(channelId).emit("receive_message", newMessage);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    });

    socket.on("typing", (channelId) => {
      socket.to(channelId).emit("typing", {
        userId: socket.user.id,
        username: socket.user.username,
        channelId
      });
    });

    socket.on("stop_typing", (channelId) => {
      socket.to(channelId).emit("stop_typing", {
        userId: socket.user.id,
        channelId
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.user.id);
      onlineUsers.delete(socket.user.id.toString());
      io.emit("online_users", Array.from(onlineUsers.values()));
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

module.exports = { initSocket, getIO };
