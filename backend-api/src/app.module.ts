import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';

import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { StorageModule } from './modules/storage/storage.module';
import { StorageService } from './modules/storage/storage.service';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { ViolationsModule } from './modules/violations/violations.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { PublicModule } from './modules/public/public.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TerminusModule,
    PrismaModule,
    HealthModule,
    StorageModule,
    SchedulesModule,
    InspectionsModule,
    ViolationsModule,
    DocumentsModule,
    PublicModule,
    JobsModule,
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly storageService: StorageService) {}

  async onModuleInit() {
    await this.storageService.testConnection();
    this.logger.log('🚀 AppModule initialized - all Role 4 modules loaded');
  }
}
