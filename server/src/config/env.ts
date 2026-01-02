import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try loading .env from multiple locations
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // server/.env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') }); // root/.env
dotenv.config(); // current directory

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  
  // MongoDB
  MONGODB_URI: z.string().default('mongodb://localhost:27017/paperinsight'),
  
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  // Qdrant
  QDRANT_URL: z.string().default('http://localhost:6333'),
  QDRANT_COLLECTION: z.string().default('papers'),
  
  // MinIO
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.string().transform(Number).default('9000'),
  MINIO_ACCESS_KEY: z.string().default('paperinsight'),
  MINIO_SECRET_KEY: z.string().default('paperinsight123'),
  MINIO_BUCKET: z.string().default('paperinsight'),
  MINIO_USE_SSL: z.string().transform((val) => val === 'true').default('false'),
  
  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  
  // DeepSeek
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_MODEL: z.string().default('deepseek-chat'),
  
  // LLM Configuration
  DEFAULT_LLM_PROVIDER: z.enum(['openai', 'deepseek']).default('openai'),
  DEFAULT_TOKEN_LIMIT: z.string().transform(Number).default('2000'),
  
  // User Token Allowance (total tokens per user)
  USER_TOKEN_ALLOWANCE: z.string().transform(Number).default('50000'),
  
  // Resend (Email)
  RESEND_API_KEY: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  
  // JWT
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default('52428800'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
