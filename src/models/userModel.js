class UserModel {
  constructor({ id, email, name, phone, role, passwordHash, firebaseUid, createdAt, updatedAt }) {
    this.id = id;
    this.email = email;
    this.name = name || '';
    this.phone = phone || '';
    this.role = role || 'customer';
    this.passwordHash = passwordHash || '';
    this.firebaseUid = firebaseUid || '';
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = UserModel;
