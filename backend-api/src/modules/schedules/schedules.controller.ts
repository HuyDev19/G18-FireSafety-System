import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleStatusDto } from './dto/update-schedule-status.dto';

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@ApiTags('Schedules - FR-05')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách lịch kiểm tra' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách lịch kiểm tra' })
  findAll(): ApiResponseEnvelope<unknown> {
    return this.schedulesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Tạo lịch kiểm tra mới' })
  @ApiBody({ type: CreateScheduleDto })
  @ApiResponse({ status: 201, description: 'Tạo lịch thành công' })
  create(@Body() dto: CreateScheduleDto): ApiResponseEnvelope<unknown> {
    return this.schedulesService.create(dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái lịch kiểm tra' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateScheduleStatusDto })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleStatusDto,
  ): ApiResponseEnvelope<unknown> {
    return this.schedulesService.updateStatus(id, dto);
  }
}
