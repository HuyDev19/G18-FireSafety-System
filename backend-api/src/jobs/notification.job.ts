import { Injectable, OnModuleInit } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class NotificationJob {
  private readonly logger = new Logger(NotificationJob.name);

  @Cron('0 6 * * *', { name: 'violation-alert-scan' })
  async handleViolationAlert() {
    this.logger.log('🕒 [06:00] Cronjob quét cảnh báo vi phạm quá hạn / thiết bị sắp hết hạn');
    // Skeleton: logic sẽ được triển khai Tuần 11 (FR-14)
  }
}
