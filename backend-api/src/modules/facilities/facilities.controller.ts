import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RiskService } from './risk.service';

@ApiTags('Facilities & Risk Engine (FR-02, FR-03)')
@ApiBearerAuth('BearerAuth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly riskService: RiskService) {}

  @Get(':facilityId/risk-history')
  @Roles(RoleCode.ADMIN, RoleCode.LEADER, RoleCode.INSPECTOR, RoleCode.OWNER)
  @ApiOperation({ summary: 'Lấy lịch sử biến động điểm rủi ro phục vụ vẽ biểu đồ Trend Chart' })
  @ApiResponse({ status: 200, description: 'Lấy dữ liệu lịch sử rủi ro thành công' })
  async getRiskHistory(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('facilityId') facilityId: string,
  ) {
    return this.riskService.getRiskScoreHistories(facilityId, currentUser);
  }
}
