import { minioClient } from '../config/minio.js';
import { env } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

class MinioService {
  private bucket = env.MINIO_BUCKET;

  /**
   * Upload a file buffer to MinIO
   * @param buffer - File buffer
   * @param originalName - Original filename
   * @param contentType - MIME type
   * @returns Object key (filename in MinIO)
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    contentType: string
  ): Promise<string> {
    const extension = originalName.split('.').pop() || 'pdf';
    const objectName = `${uuidv4()}.${extension}`;
    
    const metaData = {
      'Content-Type': contentType,
      'X-Original-Name': originalName,
    };

    await minioClient.putObject(
      this.bucket,
      objectName,
      buffer,
      buffer.length,
      metaData
    );

    return objectName;
  }

  /**
   * Download a file from MinIO as a buffer
   * @param objectName - Object key in MinIO
   * @returns File buffer
   */
  async downloadFile(objectName: string): Promise<Buffer> {
    const dataStream = await minioClient.getObject(this.bucket, objectName);
    
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      dataStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      dataStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      
      dataStream.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Delete a file from MinIO
   * @param objectName - Object key in MinIO
   */
  async deleteFile(objectName: string): Promise<void> {
    try {
      await minioClient.removeObject(this.bucket, objectName);
    } catch (error) {
      // File might not exist, log but don't throw
      console.warn(`Failed to delete file ${objectName}:`, error);
    }
  }

  /**
   * Generate a presigned URL for direct access
   * @param objectName - Object key in MinIO
   * @param expirySeconds - URL expiry time in seconds (default: 1 hour)
   * @returns Presigned URL
   */
  async getPresignedUrl(objectName: string, expirySeconds = 3600): Promise<string> {
    return minioClient.presignedGetObject(
      this.bucket,
      objectName,
      expirySeconds
    );
  }

  /**
   * Check if a file exists in MinIO
   * @param objectName - Object key in MinIO
   * @returns Boolean indicating existence
   */
  async fileExists(objectName: string): Promise<boolean> {
    try {
      await minioClient.statObject(this.bucket, objectName);
      return true;
    } catch {
      return false;
    }
  }
}

export const minioService = new MinioService();

