const crypto = require('crypto');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getEncryptionKey() {
  const secret =
    process.env.DATA_ENCRYPTION_KEY ||
    process.env.JWT_SECRET;

  if (!secret) {
    throw createError(
      500,
      'Falta DATA_ENCRYPTION_KEY o JWT_SECRET para proteger las credenciales'
    );
  }

  return crypto
    .createHash('sha256')
    .update(secret)
    .digest();
}

function encryptSecret(value) {
  const cleanValue =
    String(value || '');

  if (!cleanValue) {
    return null;
  }

  const key =
    getEncryptionKey();

  const iv =
    crypto.randomBytes(12);

  const cipher =
    crypto.createCipheriv(
      'aes-256-gcm',
      key,
      iv
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        cleanValue,
        'utf8'
      ),
      cipher.final()
    ]);

  const authTag =
    cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64')
  ].join('.');
}

function decryptSecret(value) {
  const cleanValue =
    String(value || '').trim();

  if (!cleanValue) {
    return null;
  }

  const parts =
    cleanValue.split('.');

  if (
    parts.length !== 4 ||
    parts[0] !== 'v1'
  ) {
    return null;
  }

  try {
    const key =
      getEncryptionKey();

    const decipher =
      crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(
          parts[1],
          'base64'
        )
      );

    decipher.setAuthTag(
      Buffer.from(
        parts[2],
        'base64'
      )
    );

    const decrypted =
      Buffer.concat([
        decipher.update(
          Buffer.from(
            parts[3],
            'base64'
          )
        ),
        decipher.final()
      ]);

    return decrypted.toString(
      'utf8'
    );
  } catch {
    return null;
  }
}

function hashSecret(value) {
  return crypto
    .createHash('sha256')
    .update(
      String(value || '')
    )
    .digest('hex');
}

module.exports = {
  encryptSecret,
  decryptSecret,
  hashSecret
};
