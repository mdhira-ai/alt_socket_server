const { prisma } = require("./prisma_connect");
const e = require("express");

async function checkuserisindatabase(userId, socketId, type) {
  try {
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
  } catch (error) {
    console.error("Error in checkuserisindatabase:", error);
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

async function incallupdate(tosocketId, fromuserId) {
  try {
    // Find the user by fromuserId
    const user = await prisma.userStatus.findUnique({
      where: { userId: fromuserId },
    });
    if (user) {
      const updatedUser = await prisma.userStatus.update({
        where: { userId: fromuserId },
        data: { isInCall: true },
      });
      console.log("incallupdate - updated from user:", updatedUser);
    }

    // Find the user by tosocketId
    const toUser = await prisma.userStatus.findFirst({
      where: { socketId: tosocketId },
    });
    if (toUser) {
      const updatedToUser = await prisma.userStatus.update({
        where: { userId: toUser.userId },
        data: { isInCall: true },
      });
      console.log("incallupdate - updated to user:", updatedToUser);    
    }
  } catch (error) {
    console.error("Error in incallupdate:", error);
  }
}


// Create a new call record when call is initiated
async function createCallRecord(callerId, receiverId, channelName) {
  try {
    const callRecord = await prisma.callTracker.create({
      data: {
        callerId: callerId,
        receiverId: receiverId,
        channelName: channelName,
        status: "ringing",
      },
    });
    console.log("Call record created:", callRecord);
  } catch (error) {
    console.error("Error creating call record:", error);
    throw error;
  }
}

// Update call status when accepted
async function acceptCall(callerId, receiverId) {
  try {
    const callRecord = await prisma.callTracker.updateMany({
      where: {
        callerId: callerId,
        receiverId: receiverId,
        status: "ringing",
      },
      data: {
        status: "active",
      },
    });
    console.log("Call accepted:", callRecord);
    return callRecord;
  } catch (error) {
    console.error("Error accepting call:", error);
    throw error;
  }
}

// Update call status when rejected
async function rejectCall(callerId, receiverId) {
  try {
    const callRecord = await prisma.callTracker.updateMany({
      where: {
        callerId: callerId,
        receiverId: receiverId,
        status: "ringing",
      },
      data: {
        status: "declined",
        endedAt: new Date(),
      },
    });
    console.log("Call rejected:", callRecord);
    return callRecord;
  } catch (error) {
    console.error("Error rejecting call:", error);
    throw error;
  }
}

// End call and calculate duration
async function endCall(callerId, receiverId) {
  try {
    // Find the active call
    const activeCall = await prisma.callTracker.findFirst({
      where: {
        OR: [
          { callerId: callerId, receiverId: receiverId, status: "active" },
          { callerId: receiverId, receiverId: callerId, status: "active" },
        ],
      },
    });

    if (activeCall) {
      const endTime = new Date();
      const duration = Math.floor((endTime - activeCall.startedAt) / 1000); // Duration in seconds

      const updatedCall = await prisma.callTracker.update({
        where: {
          callId: activeCall.callId,
        },
        data: {
          status: "ended",
          endedAt: endTime,
          duration: duration,
        },
      });

      // Update both users' isInCall status to false
      await prisma.userStatus.updateMany({
        where: {
          userId: {
            in: [callerId, receiverId],
          },
        },
        data: {
          isInCall: false,
        },
      });

      console.log("Call ended:", updatedCall);
      return updatedCall;
    } else {
      console.log("No active call found between users");
      return null;
    }
  } catch (error) {
    console.error("Error ending call:", error);
    throw error;
  }
}

// Handle missed call (when call times out)
async function missedCall(callerId, receiverId) {
  try {
    const callRecord = await prisma.callTracker.updateMany({
      where: {
        callerId: callerId,
        receiverId: receiverId,
        status: "ringing",
      },
      data: {
        status: "missed",
        endedAt: new Date(),
      },
    });
    console.log("Call missed:", callRecord);
    return callRecord;
  } catch (error) {
    console.error("Error updating missed call:", error);
    throw error;
  }
}


module.exports = {
  checkuserisindatabase,
  getAllRecords,
  incallupdate,
  getRecordById,
  updateRecord,
  signoutmethod,
  createCallRecord,
  acceptCall,
  rejectCall,
  endCall,
  missedCall,
};


