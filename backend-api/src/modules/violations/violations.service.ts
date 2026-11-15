import { Injectable } from '@nestjs/common';

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable()
export class ViolationsService {
  findAll(): ApiResponseEnvelope<{ violations: unknown[] }> {
    return {
      success: true,
      message: 'Violations module skeleton - FR-07: Vòng đời vi phạm OPEN -> FIXING -> RESOLVED',
      data: { violations: [] },
    };
  }

  reportFix(dto: unknown): ApiResponseEnvelope<{ violationId: string }> {
    return {
      success: true,
      message: 'Báo cáo khắc phục vi phạm (skeleton)',
      data: { violationId: 'placeholder' },
    };
  }

  verifyResolve(dto: unknown): ApiResponseEnvelope<{ violationId: string }> {
    return {
      success: true,
      message: 'Nghiệm thu vi phạm (skeleton)',
      data: { violationId: 'placeholder' },
    };
  }
}
