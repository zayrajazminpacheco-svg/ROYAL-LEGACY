class SaleModel {
  constructor({ id, customerId, items, total, costTotal, profit, paymentMethod, status, createdAt, updatedAt }) {
    this.id = id;
    this.customerId = customerId || '';
    this.items = items || [];
    this.total = total || 0;
    this.costTotal = costTotal || 0;
    this.profit = profit || 0;
    this.paymentMethod = paymentMethod || 'cash';
    this.status = status || 'completed';
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = SaleModel;
