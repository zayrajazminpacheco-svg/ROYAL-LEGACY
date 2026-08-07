const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { getDb } = require('./firestoreService');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function listProducts(query = {}) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  let collectionRef = db.collection('products');
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

async function getProduct(id) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  const doc = await db.collection('products').doc(id).get();
  if (!doc.exists) {
    throw createError(404, 'Product not found');
  }

  return { id: doc.id, ...doc.data() };
}

async function createProduct(payload) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  if (!payload.name || !payload.price) {
    throw createError(400, 'Name and price are required');
  }

  const id = payload.id || uuidv4();
  const product = {
    id,
    name: payload.name,
    description: payload.description || '',
    price: Number(payload.price),
    cost: Number(payload.cost || 0),
    stock: Number(payload.stock || 0),
    providerId: payload.providerId || '',
    imageUrl: payload.imageUrl || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.collection('products').doc(id).set(product);
  return product;
}

async function updateProduct(id, payload) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  const ref = db.collection('products').doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    throw createError(404, 'Product not found');
  }

  const updated = {
    ...existing.data(),
    ...payload,
    updatedAt: new Date().toISOString()
  };

  await ref.set(updated, { merge: true });
  return { id, ...updated };
}

async function deleteProduct(id) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  await db.collection('products').doc(id).delete();
}

async function updateStock(id, payload) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  const ref = db.collection('products').doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    throw createError(404, 'Product not found');
  }

  const nextStock = Number(payload.stock || 0);
  const updated = {
    ...existing.data(),
    stock: nextStock,
    updatedAt: new Date().toISOString()
  };

  await ref.set(updated, { merge: true });
  return { id, ...updated };
}

async function uploadProductImage(id, file) {
  if (!file) {
    throw createError(400, 'No image was provided');
  }

  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const extension = path.extname(file.originalname || 'image.jpg');
  const filename = `${id}${extension}`;
  const destination = path.join(uploadDir, filename);
  fs.writeFileSync(destination, file.buffer);

  return {
    id,
    imageUrl: `/uploads/${filename}`
  };
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  uploadProductImage
};
