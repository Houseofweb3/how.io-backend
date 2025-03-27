// src/config/env.ts
import dotenvSafe from 'dotenv-safe';

dotenvSafe.config({
  example: '.env.example', // Path to example environment variables
  allowEmptyValues: false, // Do not allow empty variables
  path: '.env', // Path to your actual environment variables
});

interface Env {
  NODE_ENV: 'dev' | 'prod'; // Restrict to 'dev' or 'prod'
  PORT: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  JWT_SECRET: string;
}

export const ENV: Env = {
  NODE_ENV: process.env.NODE_ENV as 'dev' | 'prod' || '', // Type assertion
  PORT: process.env.PORT || '',
  DB_HOST: process.env.DB_HOST || '',
  DB_PORT: process.env.DB_PORT || '5432',
  DB_USERNAME: process.env.DB_USERNAME || '',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_DATABASE: process.env.DB_DATABASE || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
};

// Validate required variables
const requiredVars = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
  'JWT_SECRET',
] as const;

requiredVars.forEach((key) => {
  if (!ENV[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

// Validate NODE_ENV
if (ENV.NODE_ENV !== 'dev' && ENV.NODE_ENV !== 'prod') {
    throw new Error(`Invalid value for NODE_ENV: ${ENV.NODE_ENV}. Allowed values are 'dev' or 'prod'.`);
}
