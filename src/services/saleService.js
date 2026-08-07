const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./firestoreService');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function calculateProfit(sale) {
  const saleTotal = Number(sale.total || 0);
  const costTotal = Number(sale.costTotal || 0);
  return saleTotal - costTotal;
}

async function listSales(query = {}) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  const snapshot = await db.collection('sales').orderBy('createdAt', 'desc').get();
  const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return {
    items,
    total: items.length,
    page: Number(query.page || 1),
    pageSize: Number(query.pageSize || 20)
  };
}

async function getSale(id) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  const doc = await db.collection('sales').doc(id).get();
  if (!doc.exists) {
    throw createError(404, 'Sale not found');
  }

  return { id: doc.id, ...doc.data() };
}

async function createSale(payload) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  if (!payload.customerId || !payload.items || !Array.isArray(payload.items)) {
    throw createError(400, 'Customer and items are required');
  }

  const id = payload.id || uuidv4();
  const total = payload.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const costTotal = payload.items.reduce((sum, item) => sum + Number(item.cost || 0) * Number(item.quantity || 0), 0);
  const sale = {
    id,
    customerId: payload.customerId,
    items: payload.items,
    total,
    costTotal,
    profit: calculateProfit({ total, costTotal }),
    paymentMethod: payload.paymentMethod || 'cash',
    status: payload.status || 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.collection('sales').doc(id).set(sale);
  return sale;
}

async function updateSale(id, payload) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  const ref = db.collection('sales').doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    throw createError(404, 'Sale not found');
  }

  const updated = {
    ...existing.data(),
    ...payload,
    updatedAt: new Date().toISOString()
  };

  if (updated.items) {
    updated.total = updated.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    updated.costTotal = updated.items.reduce((sum, item) => sum + Number(item.cost || 0) * Number(item.quantity || 0), 0);
    updated.profit = calculateProfit(updated);
  }

  await ref.set(updated, { merge: true });
  return { id, ...updated };
}

async function deleteSale(id) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  await db.collection('sales').doc(id).delete();
}

module.exports = {
  listSales,
  getSale,
  createSale,
  updateSale,
  deleteSale
};
