import { Injectable } from '@nestjs/common';

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable()
export class JobsService {
  findAll(): ApiResponseEnvelope<{ jobs: unknown[] }> {
    return {
      success: true,
      message: 'Jobs module skeleton - FR-14: Cronjob quét cảnh báo 06:00 sáng',
      data: { jobs: [] },
    };
  }
}
