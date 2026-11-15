import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client, BucketItem } from 'minio';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    StorageService,
    {
      provide: 'MINIO_CLIENT',
      useFactory: (config: ConfigService): Client => {
        return new Client({
          endPoint: config.get<string>('MINIO_ENDPOINT', 'localhost'),
          port: parseInt(config.get<string>('MINIO_PORT', '9000'), 10),
          useSSL: config.get<string>('MINIO_USE_SSL', 'false') === 'true',
          accessKey: config.get<string>('MINIO_ACCESS_KEY', 'minio_admin'),
          secretKey: config.get<string>('MINIO_SECRET_KEY', 'password123'),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'MINIO_BUCKET_NAME',
      useFactory: (config: ConfigService): string =>
        config.get<string>('MINIO_BUCKET_NAME', 'pccc-documents'),
      inject: [ConfigService],
    },
  ],
  exports: [StorageService, 'MINIO_CLIENT', 'MINIO_BUCKET_NAME'],
})
export class StorageModule {}

export type { BucketItem };
