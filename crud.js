const { prisma } = require("./prisma_connect");


// // Create a new record
// async function createRecord(data) {
//   return await prisma.user.create({
//     data,
//   });
// }

// Read all records
async function getAllRecords() {
  return await prisma.userStatus.findMany();
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


// // Delete a record by ID
// async function deleteRecord(id) {
//   return await prisma.userStatus.delete({
//     where: { id },
//   });
// }

module.exports = {
  getAllRecords,
  getRecordById,
  updateRecord,
};


