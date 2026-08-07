const { v4: uuidv4 } = require('uuid');
const { createUserRecord, getDb } = require('./firestoreService');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function listCustomers(query = {}) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  let collectionRef = db.collection('customers');
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

async function getCustomer(id) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  const doc = await db.collection('customers').doc(id).get();
  if (!doc.exists) {
    throw createError(404, 'Customer not found');
  }

  return { id: doc.id, ...doc.data() };
}

async function createCustomer(payload) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  if (!payload.name || !payload.email) {
    throw createError(400, 'Name and email are required');
  }

  const id = payload.id || uuidv4();
  const customer = {
    id,
    name: payload.name,
    email: payload.email,
    phone: payload.phone || '',
    address: payload.address || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.collection('customers').doc(id).set(customer);
  return customer;
}

async function updateCustomer(id, payload) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  const ref = db.collection('customers').doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    throw createError(404, 'Customer not found');
  }

  const updated = {
    ...existing.data(),
    ...payload,
    updatedAt: new Date().toISOString()
  };

  await ref.set(updated, { merge: true });
  return { id, ...updated };
}

async function deleteCustomer(id) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  await db.collection('customers').doc(id).delete();
}

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
