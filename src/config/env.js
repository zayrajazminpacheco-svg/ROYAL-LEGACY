const dotenv = require('dotenv');

dotenv.config();

function getEnv(name, fallback) {
  const value = process.env[name];
  return value === undefined ? fallback : value;
}

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

const requiredEnvVars = isProduction ? ['JWT_SECRET', 'DATABASE_URL'] : [];

for (const envName of requiredEnvVars) {
  if (!getEnv(envName, '')) {
    throw new Error(`Missing required environment variable: ${envName}`);
  }
}

module.exports = {
  env,
  isProduction,
  port: Number(getEnv('PORT', 3000)),
  jwtSecret: getEnv('JWT_SECRET', 'legacy-royal-stream-dev-secret'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '8h'),
  databaseUrl: getEnv('DATABASE_URL', ''),
  superAdminEmail: getEnv('SUPER_ADMIN_EMAIL', ''),
  superAdminPassword: getEnv('SUPER_ADMIN_PASSWORD', ''),
  adminEmail: getEnv('ADMIN_EMAIL', ''),
  adminPassword: getEnv('ADMIN_PASSWORD', ''),
  speiReceiverName: getEnv('SPEI_RECEIVER_NAME', ''),
  speiReceiverBank: getEnv('SPEI_RECEIVER_BANK', ''),
  speiReceiverAccount: getEnv('SPEI_RECEIVER_ACCOUNT', ''),
  speiMinAmount: Number(getEnv('SPEI_MIN_AMOUNT', 10)),
  speiMaxAmount: Number(getEnv('SPEI_MAX_AMOUNT', 50000))
};
