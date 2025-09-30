const { prisma } = require("./prisma_connect");
const e = require("express");

async function checkuserisindatabase(userId, socketId, type) {
  //   console.log("checkuserisindatabase called with:", userId, socketId, type);
  if (type === "connect") {
    const user = await prisma.userStatus.findUnique({
      where: {
        userId: userId,
      },
    });
    if (user) {
      const r = await prisma.userStatus.update({
        where: {
          userId: userId,
        },
        data: {
          isOnline: true,
          socketId: socketId,
        },
      });

      //   console.log("user status updated to online", r);
    } else {
      // create new user with status online
      await prisma.userStatus.create({
        data: {
          userId: userId,
          isOnline: true,
          socketId: socketId,
        },
      });
      //   console.log("new user created with status online");
    }
  } else if (type === "disconnect") {
    // First find the user by socketId
    const user = await prisma.userStatus.findFirst({
      where: {
        socketId: socketId,
      },
    });

    if (user) {
      const r = await prisma.userStatus.update({
        where: {
          userId: user.userId,
        },
        data: {
          isOnline: false,
          socketId: null,
        },
      });
      //   console.log("user status updated to offline", r);
    } else {
      // TODO: anonymous user disconnected, need to make table for anonymous users
      console.log("No user found with socketId:", socketId);
    }
  }
}

// user is signout but if there is socket id then make isOnline false
async function signoutmethod(socketId) {
  console.log("signoutmethod called with socketId:", socketId);
  if (socketId) {
    const user = await prisma.userStatus.findFirst({
      where: {
        socketId: socketId,
      },
    });
    if (user) {
      const r = await prisma.userStatus.update({
        where: {
          userId: user.userId,
        },
        data: {
          isOnline: false,
        },
      });
    }
  } else {
    console.log("No user found with socketId:", socketId);
  }
}

// Read all records
async function getAllRecords() {
  return await prisma.userStatus.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          language: true,
          country: true,
          currentLevel: true,
          bio: true,
        },
      },
    },
  });
}

// Read a single record by ID
async function getRecordById(id) {
  return await prisma.userStatus.findUnique({
    where: { id },
  });
}

// Update a record by ID
async function updateRecord(id, data) {
  return await prisma.userStatus.update({
    where: { id },
    data,
  });
}

module.exports = {
  checkuserisindatabase,
  getAllRecords,
  getRecordById,
  updateRecord,
  signoutmethod,
};
