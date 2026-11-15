import { Injectable } from '@nestjs/common';

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable()
export class DocumentsService {
  findAll(): ApiResponseEnvelope<{ documents: unknown[] }> {
    return {
      success: true,
      message: 'Documents module skeleton - FR-08: Upload hồ sơ/ảnh <= 10MB (MinIO)',
      data: { documents: [] },
    };
  }

  upload(dto: unknown): ApiResponseEnvelope<{ documentId: string }> {
    return {
      success: true,
      message: 'Upload hồ sơ điện tử (skeleton)',
      data: { documentId: 'placeholder' },
    };
  }
}
