import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface HealthResponse {
  status: string;
  db: string;
  timestamp: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check(): HealthResponse {
    return {
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}
