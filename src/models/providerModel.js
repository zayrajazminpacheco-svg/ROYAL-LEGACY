class ProviderModel {
  constructor({ id, name, email, phone, address, createdAt, updatedAt }) {
    this.id = id;
    this.name = name || '';
    this.email = email || '';
    this.phone = phone || '';
    this.address = address || '';
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = ProviderModel;
