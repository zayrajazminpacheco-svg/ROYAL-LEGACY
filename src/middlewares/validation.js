function validateRequiredFields(fields, payload) {
  const missing = fields.filter((field) => !payload[field]);
  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

module.exports = {
  validateRequiredFields
};
