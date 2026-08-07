const { getDb } = require('./firestoreService');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function getDashboardSummary() {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  const [customersSnap, productsSnap, salesSnap] = await Promise.all([
    db.collection('customers').get(),
    db.collection('products').get(),
    db.collection('sales').get()
  ]);

  const sales = salesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const totalProfit = sales.reduce((sum, sale) => sum + Number(sale.profit || 0), 0);

  return {
    customers: customersSnap.size,
    products: productsSnap.size,
    sales: sales.length,
    totalSales,
    totalProfit,
    lowStock: productsSnap.docs.filter((doc) => Number(doc.data().stock || 0) <= 5).length
  };
}

async function getReportData(query = {}) {
  const db = getDb();
  if (!db) {
    throw createError(503, 'Firestore is not configured');
  }

  const salesSnap = await db.collection('sales').orderBy('createdAt', 'desc').get();
  const sales = salesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return {
    sales,
    filters: query,
    total: sales.length
  };
}

module.exports = {
  getDashboardSummary,
  getReportData
};
