const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./firestoreService');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function listProviders(query = {}) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  let collectionRef = db.collection('providers');
  if (query.search) {
    collectionRef = collectionRef.where('name', '>=', query.search).where('name', '<=', query.search + '\uf8ff');
  }

  const snapshot = await collectionRef.orderBy('createdAt', 'desc').get();
  const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return {
    items,
    total: items.length,
    page: Number(query.page || 1),
    pageSize: Number(query.pageSize || 20)
  };
}

async function getProvider(id) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  const doc = await db.collection('providers').doc(id).get();
  if (!doc.exists) {
    throw createError(404, 'Provider not found');
  }

  return { id: doc.id, ...doc.data() };
}

async function createProvider(payload) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  if (!payload.name || !payload.email) {
    throw createError(400, 'Name and email are required');
  }

  const id = payload.id || uuidv4();
  const provider = {
    id,
    name: payload.name,
    email: payload.email,
    phone: payload.phone || '',
    address: payload.address || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.collection('providers').doc(id).set(provider);
  return provider;
}

async function updateProvider(id, payload) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  const ref = db.collection('providers').doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    throw createError(404, 'Provider not found');
  }

  const updated = {
    ...existing.data(),
    ...payload,
    updatedAt: new Date().toISOString()
  };

  await ref.set(updated, { merge: true });
  return { id, ...updated };
}

async function deleteProvider(id) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  await db.collection('providers').doc(id).delete();
}

module.exports = {
  listProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider
};
