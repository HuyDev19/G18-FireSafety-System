import { Injectable } from '@nestjs/common';

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable()
export class InspectionsService {
  getCriteria(): ApiResponseEnvelope<{ criteria: unknown[] }> {
    return {
      success: true,
      message: 'Inspections module skeleton - FR-06: Biên bản kiểm tra, tự sinh vi phạm',
      data: { criteria: [] },
    };
  }

  submit(scheduleId: string, dto: unknown): ApiResponseEnvelope<{ inspectionId: string }> {
    return {
      success: true,
      message: 'Nộp biên bản kiểm tra (skeleton)',
      data: { inspectionId: 'placeholder' },
    };
  }
}
