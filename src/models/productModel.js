class ProductModel {
  constructor({ id, name, description, price, cost, stock, providerId, imageUrl, createdAt, updatedAt }) {
    this.id = id;
    this.name = name || '';
    this.description = description || '';
    this.price = price || 0;
    this.cost = cost || 0;
    this.stock = stock || 0;
    this.providerId = providerId || '';
    this.imageUrl = imageUrl || '';
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = ProductModel;
