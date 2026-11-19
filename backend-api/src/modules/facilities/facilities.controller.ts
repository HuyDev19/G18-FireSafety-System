import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RiskService } from './risk.service';

@ApiTags('Facilities & Risk Engine (FR-02, FR-03)')
@ApiBearerAuth('BearerAuth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly riskService: RiskService) {}

  @Get(':facilityId/risk-history')
  @ApiOperation({ summary: 'Lấy lịch sử biến động điểm rủi ro phục vụ vẽ biểu đồ Trend Chart' })
  @ApiResponse({ status: 200, description: 'Lấy dữ liệu lịch sử rủi ro thành công' })
  async getRiskHistory(@Param('facilityId') facilityId: string) {
    return this.riskService.getRiskScoreHistories(facilityId);
  }
}
