import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Ip,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InternalLoginDto } from './dto/internal-login.dto';
import { OwnerLoginDto } from './dto/owner-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Verify2FaDto } from './dto/verify-2fa.dto';

@ApiTags('Authentication & MFA (FR-01)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('internal/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập Cán bộ PCCC nội bộ (Bước 1 - Yêu cầu MFA)',
    description: 'Chỉ dành cho ADMIN, LEADER, INSPECTOR. Trả về tempToken nếu cần xác thực bước 2 (MFA).',
  })
  async internalLogin(@Body() dto: InternalLoginDto, @Ip() ipAddress: string) {
    return this.authService.internalLogin(dto, ipAddress);
  }

  @Public()
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hoàn tất xác thực 2 bước (MFA TOTP) cho Cán bộ PCCC (Bước 2)',
    description: 'Nhận tempToken và mã OTP 6 số để cấp JWT Access Token và Refresh Token.',
  })
  async verify2Fa(@Body() dto: Verify2FaDto, @Ip() ipAddress: string) {
    return this.authService.verify2Fa(dto, ipAddress);
  }

  @Public()
  @Post('owner/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập Cổng Doanh nghiệp / Chủ cơ sở (FR-01)',
    description: 'Chỉ dành cho tài khoản vai trò OWNER được cấp phát. Chống brute-force và khóa 15 phút nếu sai 5 lần.',
  })
  async ownerLogin(@Body() dto: OwnerLoginDto, @Ip() ipAddress: string) {
    return this.authService.ownerLogin(dto, ipAddress);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cấp mới Access Token bằng Refresh Token (Token Rotation)',
    description: 'Xác thực refresh token và xoay vòng refresh token mới vào CSDL.',
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('change-password')
  @ApiOperation({
    summary: 'Đổi mật khẩu người dùng (Bắt buộc với tài khoản vừa được cấp phát)',
  })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Ip() ipAddress: string,
  ) {
    return this.authService.changePassword(user.id, dto, ipAddress);
  }

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Chặn tự đăng ký (Zero Self-Registration Policy)',
    description: 'Luật GovTech: Tuyệt đối không cung cấp endpoint tự do đăng ký.',
  })
  @ApiResponse({ status: 403, description: 'Từ chối tự đăng ký' })
  blockRegister() {
    throw new ForbiddenException(
      'Hệ thống PCCC GovTech không cho phép tự đăng ký tài khoản (Zero Self-Registration). Mọi tài khoản phải được cấp phát bởi cơ quan có thẩm quyền qua API /api/users/provision-owner.',
    );
  }
}

