const { initializeFirebase } = require('../config/firebase');

function getDb() {
  const admin = initializeFirebase();
  if (!admin) {
    return null;
  }

  return admin.firestore();
}

async function createUserRecord(userData) {
  const db = getDb();
  if (!db) {
    const error = new Error('Firebase Firestore is not configured');
    error.status = 503;
    throw error;
  }

  await db.collection('users').doc(userData.id).set(userData, { merge: true });
  return userData;
}

async function getUserByEmail(email) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const snapshot = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data();
}

async function getUserByUid(uid) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const snapshot = await db.collection('users').where('id', '==', uid).limit(1).get();
  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data();
}

module.exports = {
  createUserRecord,
  getUserByEmail,
  getUserByUid,
  getDb
};
