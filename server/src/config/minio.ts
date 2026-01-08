import { Client } from 'minio';
import { env } from './env.js';

export const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export async function initializeMinio(): Promise<void> {
  try {
    const bucketExists = await minioClient.bucketExists(env.MINIO_BUCKET);
    
    if (!bucketExists) {
      await minioClient.makeBucket(env.MINIO_BUCKET, 'us-east-1');
      console.log(`✅ MinIO bucket '${env.MINIO_BUCKET}' created`);
    } else {
      console.log(`✅ MinIO bucket exists: ${env.MINIO_BUCKET}`);
    }
  } catch (error) {
    console.error('❌ Failed to initialize MinIO:', error);
    console.warn('⚠️  MinIO not available - file uploads will not work until MinIO is running');
    console.warn('   Run: npm run docker:up (or start Docker Desktop first)');
  }
}



