const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const {
  checkuserisindatabase,
  getAllRecords,
  signoutmethod,
} = require("./utils");

const { generateUniqueChannelName } = require("./channelcheck");
const { prisma } = require("./prisma_connect");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", async (socket) => {
  console.log("a user connected", socket.id);

  socket.on("iamonline", async (userId) => {
    console.log("User is online:", userId);
    await checkuserisindatabase(userId.userId, socket.id, "connect");
    getAllRecords().then((records) => {
      io.emit("allUsersStatus", records);
    });
  });

  socket.on("iamoffline", async (socketid) => {
    console.log("User is offline:", socketid);

    await signoutmethod(socketid.socketId);
    getAllRecords().then((records) => {
      io.emit("allUsersStatus", records);
    });
  });

  socket.on("update-peer-id", async (data) => {
    console.log("update-peer-id event received:", data);
    try {
      const updatedUser = await prisma.userStatus.update({
        where: { userId: data.userId },
        data: { peerId: data.peerId },
      });

      getAllRecords().then((records) => {
        io.emit("allUsersStatus", records);
      });


      console.log("Peer ID updated successfully:", updatedUser);
    } catch (error) {
      console.error("Error updating Peer ID:", error);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
