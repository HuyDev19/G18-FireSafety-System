import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleCode } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InternalLoginDto } from './dto/internal-login.dto';
import { OwnerLoginDto } from './dto/owner-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Verify2FaDto } from './dto/verify-2fa.dto';

interface TempMfaPayload {
  sub: string;
  isTempMfa: boolean;
}

interface RefreshPayload {
  sub: string;
  email: string;
  role: RoleCode;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Kiểm tra và xử lý khóa tạm 15 phút nếu thử sai quá 5 lần
   */
  private async handleFailedLogin(userId: string, currentFailedCount: number, ipAddress?: string) {
    const newCount = currentFailedCount + 1;
    let lockedUntil: Date | null = null;

    if (newCount >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      await this.auditService.createLog({
        userId,
        action: 'ACCOUNT_LOCKED_BRUTE_FORCE',
        entity: 'USER',
        entityId: userId,
        afterData: {
          failedLoginCount: newCount,
          lockedUntil: lockedUntil.toISOString(),
          lockoutMinutes: LOCKOUT_MINUTES,
        },
        ipAddress,
      });
    } else {
      await this.auditService.createLog({
        userId,
        action: 'LOGIN_FAILED',
        entity: 'USER',
        entityId: userId,
        afterData: { failedLoginCount: newCount },
        ipAddress,
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: newCount,
        lockedUntil,
      },
    });

    if (newCount >= MAX_FAILED_ATTEMPTS) {
      throw new UnauthorizedException(
        `Tài khoản đã bị tạm khóa ${LOCKOUT_MINUTES} phút do đăng nhập sai ${MAX_FAILED_ATTEMPTS} lần liên tiếp.`,
      );
    }
  }

  /**
   * Tạo Access Token & Refresh Token
   */
  private async generateTokens(user: {
    id: string;
    email: string;
    role: RoleCode;
    areaCode?: string | null;
    fullName: string;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      areaCode: user.areaCode,
      fullName: user.fullName,
    };

    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key_pccc_g18';
    const jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '1d';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') || 'g18_pccc_jwt_refresh_secret_key';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn: jwtExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    // Lưu hash refresh token vào CSDL để hỗ trợ xoay vòng và thu hồi token (Tuần 3)
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        areaCode: user.areaCode,
      },
    };
  }

  /**
   * 1. Đăng nhập Cổng Cán bộ nội bộ (MFA bước 1)
   */
  async internalLogin(dto: InternalLoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase().trim(),
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (user.role === RoleCode.OWNER) {
      throw new ForbiddenException(
        'Tài khoản Chủ cơ sở vui lòng đăng nhập tại Cổng Doanh nghiệp (/doanh-nghiep/login)',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị tạm dừng hoạt động');
    }

    // Kiểm tra khóa tạm 15 phút
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000),
      );
      throw new UnauthorizedException(
        `Tài khoản đang bị tạm khóa. Vui lòng thử lại sau ${remainingMinutes} phút.`,
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      const effectiveFailedCount =
        user.lockedUntil && user.lockedUntil <= new Date() ? 0 : user.failedLoginCount;
      await this.handleFailedLogin(user.id, effectiveFailedCount, ipAddress);
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Nếu người dùng có bật MFA / 2FA (mặc định với Cán bộ PCCC)
    if (user.isTwoFactorEnabled) {
      const tempToken = await this.jwtService.signAsync(
        { sub: user.id, isTempMfa: true },
        {
          secret: this.configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key_pccc_g18',
          expiresIn: '5m',
        },
      );

      return {
        mfaRequired: true,
        tempToken,
        message: 'Vui lòng nhập mã xác thực OTP 2FA 6 số để tiếp tục',
      };
    }

    // Không bật MFA: Cấp token trực tiếp
    const tokens = await this.generateTokens(user);
    await this.auditService.createLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'USER',
      entityId: user.id,
      ipAddress,
    });

    return tokens;
  }

  /**
   * 2. Hoàn tất xác thực MFA TOTP (Bước 2 của Đăng nhập cán bộ)
   */
  async verify2Fa(dto: Verify2FaDto, ipAddress?: string) {
    let payload: TempMfaPayload;
    try {
      payload = await this.jwtService.verifyAsync<TempMfaPayload>(dto.tempToken, {
        secret: this.configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key_pccc_g18',
      });
    } catch {
      throw new UnauthorizedException('Phiên xác thực MFA đã hết hạn hoặc không hợp lệ');
    }

    if (!payload.isTempMfa || !payload.sub) {
      throw new UnauthorizedException('Mã xác thực tạm thời không hợp lệ');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    }

    if (user.role === RoleCode.OWNER) {
      throw new ForbiddenException('Tài khoản Chủ cơ sở không sử dụng luồng MFA nội bộ');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000),
      );
      throw new UnauthorizedException(
        `Tài khoản đang bị tạm khóa. Vui lòng thử lại sau ${remainingMinutes} phút.`,
      );
    }

    // Kiểm tra mã OTP: hỗ trợ cả mã TOTP chuẩn RFC 6238 lẫn mã mẫu demo '123456'
    let isValidOtp = false;
    const allowDemoOtp = this.configService.get<string>('NODE_ENV') !== 'production';
    if (allowDemoOtp && dto.code === '123456') {
      isValidOtp = true;
    } else if (user.twoFactorSecret) {
      isValidOtp = authenticator.verify({
        token: dto.code,
        secret: user.twoFactorSecret,
      });
    }

    if (!isValidOtp) {
      const effectiveFailedCount =
        user.lockedUntil && user.lockedUntil <= new Date() ? 0 : user.failedLoginCount;
      await this.handleFailedLogin(user.id, effectiveFailedCount, ipAddress);
      throw new UnauthorizedException('Mã xác thực OTP không chính xác');
    }

    const tokens = await this.generateTokens(user);
    await this.auditService.createLog({
      userId: user.id,
      action: 'LOGIN_MFA_SUCCESS',
      entity: 'USER',
      entityId: user.id,
      ipAddress,
    });

    return tokens;
  }

  /**
   * 3. Đăng nhập Cổng Doanh nghiệp (Chủ cơ sở)
   */
  async ownerLogin(dto: OwnerLoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase().trim(),
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (user.role !== RoleCode.OWNER) {
      throw new ForbiddenException(
        'Tài khoản Cán bộ PCCC vui lòng đăng nhập tại Cổng Nội bộ (/admin-portal/login)',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị tạm dừng hoạt động');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000),
      );
      throw new UnauthorizedException(
        `Tài khoản đang bị tạm khóa. Vui lòng thử lại sau ${remainingMinutes} phút.`,
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      const effectiveFailedCount =
        user.lockedUntil && user.lockedUntil <= new Date() ? 0 : user.failedLoginCount;
      await this.handleFailedLogin(user.id, effectiveFailedCount, ipAddress);
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const tokens = await this.generateTokens(user);
    await this.auditService.createLog({
      userId: user.id,
      action: 'LOGIN_OWNER_SUCCESS',
      entity: 'USER',
      entityId: user.id,
      ipAddress,
    });

    return {
      ...tokens,
      mustChangePassword: user.mustChangePassword,
    };
  }

  /**
   * 4. Cấp mới Access Token bằng Refresh Token (Token Rotation)
   */
  async refresh(dto: RefreshTokenDto) {
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') || 'g18_pccc_jwt_refresh_secret_key';

    let payload: RefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshPayload>(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });

    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('Phiên đăng nhập đã bị thu hồi');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Tài khoản đang bị tạm khóa');
    }

    const isMatch = await bcrypt.compare(dto.refreshToken, user.refreshTokenHash);
    if (!isMatch) {
      throw new UnauthorizedException('Refresh token đã bị hủy hoặc thay thế');
    }

    // Xoay vòng token (Issue new tokens & update new hash)
    return this.generateTokens(user);
  }

  /**
   * 5. Đổi mật khẩu cá nhân
   */
  async changePassword(userId: string, dto: ChangePasswordDto, ipAddress?: string) {
    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('Mật khẩu mới không được trùng mật khẩu cũ');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Người dùng không tồn tại hoặc đã bị vô hiệu hóa');
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false, // Hủy cờ bắt buộc đổi mật khẩu
        refreshTokenHash: null,    // Thu hồi refresh token cũ để buộc xác thực lại khi cần
      },
    });

    await this.auditService.createLog({
      userId,
      action: 'CHANGE_PASSWORD',
      entity: 'USER',
      entityId: userId,
      ipAddress,
    });

    return { message: 'Đổi mật khẩu thành công' };
  }
}

