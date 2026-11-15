import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

export interface StorageFileInfo {
  bucketName: string;
  objectName: string;
  url: string;
  size: number;
  lastModified: Date;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.minioClient = new Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get<string>('MINIO_PORT', '9000'), 10),
      useSSL: this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minio_admin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'password123'),
    });
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME', 'pccc-documents');
  }

  async onModuleInit() {
    await this.testConnection();
  }

  async testConnection(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, '');
        this.logger.log(`✅ MinIO bucket '${this.bucketName}' created`);
      } else {
        this.logger.log(`✅ MinIO bucket '${this.bucketName}' ready`);
      }
    } catch (error) {
      this.logger.warn(`⚠️ MinIO connection warning: ${(error as Error).message} (MinIO may not be running locally - acceptable for Week 3)`);
    }
  }

  async uploadFile(fileName: string, buffer: Buffer, mimeType: string): Promise<string> {
    await this.minioClient.putObject(this.bucketName, fileName, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    const protocol = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true' ? 'https' : 'http';
    const host = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    return `${protocol}://${host}:${port}/${this.bucketName}/${fileName}`;
  }

  async getPresignedUrl(fileName: string, expirySeconds: number = 300): Promise<string> {
    return this.minioClient.presignedGetObject(this.bucketName, fileName, expirySeconds);
  }

  async deleteFile(fileName: string): Promise<void> {
    await this.minioClient.removeObject(this.bucketName, fileName);
  }

  getBucketName(): string {
    return this.bucketName;
  }
}
