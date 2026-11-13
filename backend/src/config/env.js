const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_placement',
    poolSize: Number(process.env.DB_POOL_SIZE || 10),
  },
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecure: String(process.env.COOKIE_SECURE).toLowerCase() === 'true',
  maxResumeMb: Number(process.env.MAX_RESUME_MB || 5),
  deadlineReminderDays: Number(process.env.DEADLINE_REMINDER_DAYS || 7),
  ai: {
    apiKey: process.env.AI_API_KEY || '',
    apiUrl: process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
  },
};

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET is not configured. Copy .env.example to .env and set a strong secret.');
}

if (env.jwtSecret.length < 32 && env.nodeEnv === 'production') {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}

module.exports = env;
