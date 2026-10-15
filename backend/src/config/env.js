import dotenv from 'dotenv';
import { validateEnv } from '../validators/env.validator.js';

// Load environment variables from .env file
dotenv.config();

// Validate and export strongly typed/defaulted environment configuration
export const env = validateEnv(process.env);
