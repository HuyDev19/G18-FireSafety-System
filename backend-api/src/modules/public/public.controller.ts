import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicService } from './public.service';

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@ApiTags('Public - FR-16')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('facilities')
  @ApiOperation({ summary: 'Tra cứu cơ sở PCCC công khai (Rate Limit)' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách cơ sở công khai' })
  findAll(): ApiResponseEnvelope<{ facilities: unknown[] }> {
    return this.publicService.findAll();
  }
}
