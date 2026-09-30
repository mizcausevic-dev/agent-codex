import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT ?? '3002', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
