import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JobsService } from './jobs.service';

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@ApiTags('Jobs - FR-14')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách cronjob / cảnh báo' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách jobs' })
  findAll(): ApiResponseEnvelope<{ jobs: unknown[] }> {
    return this.jobsService.findAll();
  }
}
