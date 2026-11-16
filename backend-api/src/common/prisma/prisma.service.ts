import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Đã kết nối thành công tới Cloud PostgreSQL');
    } catch (error: any) {
      this.logger.warn(`⚠️ Cảnh báo kết nối DB: ${error?.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
