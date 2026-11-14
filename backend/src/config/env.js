import 'dotenv/config';

export const env = {
  PORT: process.env.PORT || 4000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  ACCESS_TTL: process.env.ACCESS_TTL || '15m',
  REFRESH_TTL: process.env.REFRESH_TTL || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};