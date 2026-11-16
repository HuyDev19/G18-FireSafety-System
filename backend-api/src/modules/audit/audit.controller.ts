import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';

@ApiTags('Audit Logs (FR-12)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(RoleCode.ADMIN, RoleCode.LEADER)
  @ApiOperation({ summary: 'Xem danh sách nhật ký thao tác & sự kiện bảo mật (Admin, Lãnh đạo)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách audit log thành công' })
  async getAuditLogs(@Query() query: QueryAuditDto) {
    return this.auditService.getAuditLogs(query);
  }
}

