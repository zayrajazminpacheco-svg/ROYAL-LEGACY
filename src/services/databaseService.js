const prisma = require('../lib/prisma');

async function connectDatabase() {
  try {
    await prisma.$connect();
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  connectDatabase
};
