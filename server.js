const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { checkuserisindatabase, getAllRecords, signoutmethod } = require("./utils");

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
   
    await signoutmethod(socketid.socketId)
    getAllRecords().then((records) => {
      io.emit("allUsersStatus", records);
    });
  });




  socket.on("disconnect", () => {
    console.log("user disconnected");
    checkuserisindatabase(null, socket.id, "disconnect");
    socket.broadcast.emit("userDisconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
