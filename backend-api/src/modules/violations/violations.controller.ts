import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ViolationsService } from './violations.service';
import { ReportFixDto } from './dto/report-fix.dto';
import { VerifyResolveDto } from './dto/verify-resolve.dto';

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@ApiTags('Violations - FR-07')
@Controller('violations')
export class ViolationsController {
  constructor(private readonly violationsService: ViolationsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách vi phạm' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách vi phạm' })
  findAll(): ApiResponseEnvelope<{ violations: unknown[] }> {
    return this.violationsService.findAll();
  }

  @Post('report-fix')
  @ApiOperation({ summary: 'Chủ cơ sở báo cáo khắc phục (OPEN -> FIXING)' })
  @ApiBody({ type: ReportFixDto })
  @ApiResponse({ status: 200, description: 'Báo cáo khắc phục thành công' })
  reportFix(@Body() dto: ReportFixDto): ApiResponseEnvelope<{ violationId: string }> {
    return this.violationsService.reportFix(dto);
  }

  @Patch('verify-resolve')
  @ApiOperation({ summary: 'Cán bộ nghiệm thu (FIXING -> RESOLVED)' })
  @ApiBody({ type: VerifyResolveDto })
  @ApiResponse({ status: 200, description: 'Nghiệm thu vi phạm thành công' })
  verifyResolve(@Body() dto: VerifyResolveDto): ApiResponseEnvelope<{ violationId: string }> {
    return this.violationsService.verifyResolve(dto);
  }
}
