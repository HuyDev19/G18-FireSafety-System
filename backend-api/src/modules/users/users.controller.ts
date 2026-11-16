import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '@prisma/client';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { ProvisionOwnerDto } from './dto/provision-owner.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@ApiTags('Users & Identity Provisioning (FR-01)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('provision-owner')
  @Roles(RoleCode.ADMIN, RoleCode.INSPECTOR)
  @ApiOperation({
    summary: 'Cấp phát tài khoản Doanh nghiệp / Chủ cơ sở (Identity Provisioning)',
    description:
      'Chỉ Admin hoặc Cán bộ kiểm tra phụ trách cơ sở mới được cấp phát. Bắt buộc gắn liền với facilityId, cấm tự đăng ký.',
  })
  @ApiResponse({ status: 201, description: 'Cấp phát tài khoản thành công kèm mật khẩu tạm' })
  async provisionOwner(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ProvisionOwnerDto,
    @Ip() ipAddress: string,
  ) {
    return this.usersService.provisionOwner(currentUser, dto, ipAddress);
  }

  @Post('staff')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Tạo tài khoản Cán bộ nội bộ PCCC (Chỉ Admin)' })
  async createStaffUser(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateStaffUserDto,
    @Ip() ipAddress: string,
  ) {
    return this.usersService.createStaffUser(currentUser, dto, ipAddress);
  }

  @Get()
  @Roles(RoleCode.ADMIN, RoleCode.LEADER)
  @ApiOperation({ summary: 'Lấy danh sách người dùng phân trang & bộ lọc' })
  async findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryUsersDto,
  ) {
    return this.usersService.findAll(currentUser, query);
  }

  @Get(':id')
  @Roles(RoleCode.ADMIN, RoleCode.LEADER, RoleCode.INSPECTOR)
  @ApiOperation({ summary: 'Xem chi tiết tài khoản người dùng' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/status')
  @Roles(RoleCode.ADMIN)
  @ApiOperation({ summary: 'Khóa / Mở khóa tài khoản người dùng' })
  async updateStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Ip() ipAddress: string,
  ) {
    return this.usersService.updateStatus(currentUser, id, dto.isActive, ipAddress);
  }

  @Post(':id/reset-password')
  @Roles(RoleCode.ADMIN, RoleCode.INSPECTOR)
  @ApiOperation({ summary: 'Đặt lại mật khẩu cho tài khoản (Admin hoặc Cán bộ đã cấp phát)' })
  async resetPassword(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Ip() ipAddress: string,
  ) {
    return this.usersService.resetPassword(currentUser, id, ipAddress);
  }
}

