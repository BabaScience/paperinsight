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
  // In development, add timeout to prevent hanging
  const timeout = env.NODE_ENV === 'development' ? 3000 : 10000;
  
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('MinIO initialization timeout')), timeout);
    });
    
    const initPromise = (async () => {
      const bucketExists = await minioClient.bucketExists(env.MINIO_BUCKET);
      
      if (!bucketExists) {
        await minioClient.makeBucket(env.MINIO_BUCKET, 'us-east-1');
        console.log(`✅ MinIO bucket '${env.MINIO_BUCKET}' created`);
      } else {
        console.log(`✅ MinIO bucket exists: ${env.MINIO_BUCKET}`);
      }
    })();
    
    await Promise.race([initPromise, timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.message === 'MinIO initialization timeout') {
      console.warn('⚠️  MinIO initialization timed out - continuing without MinIO');
    } else {
      console.warn('⚠️  MinIO not available - file uploads will not work until MinIO is running');
    }
    console.warn('   Run: npm run docker:up (or start Docker Desktop first)');
  }
}



