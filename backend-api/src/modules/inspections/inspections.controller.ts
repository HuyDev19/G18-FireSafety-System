import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { InspectionsService } from './inspections.service';
import { SubmitInspectionDto } from './dto/submit-inspection.dto';

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@ApiTags('Inspections - FR-06')
@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Get('criteria')
  @ApiOperation({ summary: 'Danh mục checklist kiểm tra' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách tiêu chí kiểm tra' })
  getCriteria(): ApiResponseEnvelope<{ criteria: unknown[] }> {
    return this.inspectionsService.getCriteria();
  }

  @Post(':scheduleId/submit')
  @ApiOperation({ summary: 'Nộp biên bản kiểm tra' })
  @ApiParam({ name: 'scheduleId', type: String })
  @ApiBody({ type: SubmitInspectionDto })
  @ApiResponse({ status: 201, description: 'Nộp biên bản thành công' })
  submit(@Param('scheduleId') scheduleId: string, @Body() dto: SubmitInspectionDto): ApiResponseEnvelope<{ inspectionId: string }> {
    return this.inspectionsService.submit(scheduleId, dto);
  }
}
