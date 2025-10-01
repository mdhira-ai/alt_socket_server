// ...existing code...

const { v4: uuidv4 } = require('uuid'); // npm install uuid
const { prisma } = require('./prisma_connect');

async function generateUniqueChannelName() {
  let channelName;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate UUID-based channel name
    channelName = `call_${uuidv4()}`;
    
    // Check if it exists in database
    const existingCall = await prisma.callTracker.findFirst({
      where: {
        channelName: channelName,
      },
    });
    
    if (!existingCall) {
      isUnique = true;
    }
  }
  
  return channelName;
}


module.exports = { generateUniqueChannelName };

