const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const {
  checkuserisindatabase,
  getAllRecords,
  signoutmethod,
  incallupdate,
  createCallRecord,
  acceptCall,
  rejectCall,
  endCall,
  missedCall,
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

  socket.on("calluser", async (data) => {
    try {
      // Generate unique channel name
      const channelName = await generateUniqueChannelName();

      console.log("Generated channel name:", channelName);
      console.log("Call data:", data.callerid, data.receiverid);
      //   io.to(data.userToCall).emit("incomingCall", {
      //     from: data.from,
      //     name: data.name,
      //     channelName: channelName, // Send the generated channel name
      //   });

      // Create call record when call is initiated
      await createCallRecord(data.callerid, data.receiverid, channelName);
    } catch (error) {
      console.error("Error creating call:", error);
    }
  });

  socket.on("callAccepted", async (data) => {
    try {
      // Update call status to accepted
      await acceptCall(data.callerid, data.receiverid);

      // Update user status to in call
      await incallupdate(data.to, data.from);

      //   io.to(data.to).emit("callAccepted", {
      //     from: data.from,
      //     name: data.name,
      //   });

      getAllRecords().then((records) => {
        io.emit("allUsersStatus", records);
      });
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  });

  socket.on("callRejected", async (data) => {
    try {
      // Update call status to rejected
      console.log("Call rejected data:", data);

      await rejectCall(data.callerid, data.receiverid);

      io.to(data.to).emit("callRejected", {
        from: data.from,
      });
    } catch (error) {
      console.error("Error rejecting call:", error);
    }
  });

  socket.on("endCall", async (data) => {
    try {
      // End the call and update duration
      io.to(data.to).emit("callEnded", {
        from: data.from,
      });

      await endCall(data.callerid, data.receiverid);
      getAllRecords().then((records) => {
        io.emit("allUsersStatus", records);
      });
    } catch (error) {
      console.error("Error ending call:", error);
    }
  });

  socket.on("callMissed", async (data) => {
    try {
      // Handle missed call
      await missedCall(data.callerid, data.receiverid);
    } catch (error) {
      console.error("Error handling missed call:", error);
    }
  });

  socket.on("disconnect", async () => {
    console.log("user disconnected");

    // Find users in call with this socket ID first
    const usersInCall = await prisma.userStatus.findMany({
      where: { socketId: socket.id, isInCall: true },
      select: { userId: true },
    });

    console.log("Users in call with this socket ID:", usersInCall);

    
    const r = await prisma.callTracker.findFirst({
      where: {
        OR: [
          { callerId: usersInCall[0]?.userId, status: "active" },
          { receiverId: usersInCall[0]?.userId, status: "active" },
        ],
      },
      select: { receiverId: true, callerId: true },
    });

    if (r) {
      await prisma.userStatus.updateMany({
        where: {
          userId: {
            in: [r.callerId, r.receiverId],
          },
        },
        data: { isInCall: false },
      });

      await endCall(r.callerId, r.receiverId);
    }

    console.log(r.callerId, r.receiverId, "call record on disconnect");

    checkuserisindatabase(null, socket.id, "disconnect");

    socket.broadcast.emit("userDisconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
