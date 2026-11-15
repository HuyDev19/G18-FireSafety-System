import { Injectable } from '@nestjs/common';

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable()
export class PublicService {
  findAll(): ApiResponseEnvelope<{ facilities: unknown[] }> {
    return {
      success: true,
      message: 'Public module skeleton - FR-16: API tra cứu công khai',
      data: { facilities: [] },
    };
  }
}
