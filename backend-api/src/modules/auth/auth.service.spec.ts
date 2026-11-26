import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { RoleCode } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from './auth.service';

describe('AuthService (FR-01 Auth, MFA, Lockout & Token Rotation)', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'NODE_ENV') return 'test';
      if (key === 'JWT_SECRET') return 'test-jwt-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
      return undefined;
    }),
  };

  const mockAuditService = {
    createLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('internalLogin', () => {
    it('should return mfaRequired and tempToken for internal staff with 2FA enabled', async () => {
      const passwordHash = await bcrypt.hash('MatKhau123@', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'staff-1',
        email: 'canbo@pccc.gov.vn',
        passwordHash,
        fullName: 'Cán bộ A',
        role: RoleCode.INSPECTOR,
        areaCode: 'Quận 1',
        isActive: true,
        isTwoFactorEnabled: true,
        failedLoginCount: 0,
        lockedUntil: null,
      });
      mockJwtService.signAsync.mockResolvedValue('temp-mfa-token');

      const result = await service.internalLogin(
        { email: 'canbo@pccc.gov.vn', password: 'MatKhau123@' },
        '10.0.0.1',
      );

      expect(result).toEqual(
        expect.objectContaining({
          mfaRequired: true,
          tempToken: 'temp-mfa-token',
        }),
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'staff-1', isTempMfa: true },
        expect.objectContaining({ expiresIn: '5m' }),
      );
    });

    it('should reject OWNER trying to login via internal portal', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'owner-1',
        email: 'owner@example.com',
        role: RoleCode.OWNER,
        isActive: true,
      });

      await expect(
        service.internalLogin({ email: 'owner@example.com', password: 'Password@1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should lock account for 15 minutes and log CRITICAL audit on 5th consecutive failed attempt', async () => {
      const passwordHash = await bcrypt.hash('Correct@123', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'staff-1',
        email: 'canbo@pccc.gov.vn',
        passwordHash,
        fullName: 'Cán bộ A',
        role: RoleCode.INSPECTOR,
        isActive: true,
        failedLoginCount: 4,
        lockedUntil: null,
      });
      mockPrisma.user.update.mockResolvedValue({});

      await expect(
        service.internalLogin(
          { email: 'canbo@pccc.gov.vn', password: 'WrongPassword' },
          '192.168.1.50',
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'staff-1' },
          data: expect.objectContaining({
            failedLoginCount: 5,
            lockedUntil: expect.any(Date),
          }),
        }),
      );
      expect(mockAuditService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACCOUNT_LOCKED_BRUTE_FORCE',
          entity: 'USER',
          entityId: 'staff-1',
          ipAddress: '192.168.1.50',
        }),
      );
    });

    it('should reset failed counter instead of immediately re-locking after 15m lockout expires', async () => {
      const passwordHash = await bcrypt.hash('Correct@123', 10);
      const expiredLock = new Date(Date.now() - 60 * 1000);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'staff-1',
        email: 'canbo@pccc.gov.vn',
        passwordHash,
        fullName: 'Cán bộ A',
        role: RoleCode.INSPECTOR,
        isActive: true,
        failedLoginCount: 5,
        lockedUntil: expiredLock,
      });
      mockPrisma.user.update.mockResolvedValue({});

      await expect(
        service.internalLogin(
          { email: 'canbo@pccc.gov.vn', password: 'WrongPassword' },
          '10.0.0.2',
        ),
      ).rejects.toThrow('Email hoặc mật khẩu không chính xác');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { failedLoginCount: 1, lockedUntil: null },
        }),
      );
      expect(mockAuditService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILED' }),
      );
    });
  });

  describe('verify2Fa', () => {
    it('should verify valid TOTP secret code, issue tokens, and audit LOGIN_MFA_SUCCESS', async () => {
      const secret = authenticator.generateSecret();
      const validCode = authenticator.generate(secret);

      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'staff-1', isTempMfa: true });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'staff-1',
        email: 'canbo@pccc.gov.vn',
        fullName: 'Cán bộ A',
        role: RoleCode.INSPECTOR,
        areaCode: 'Quận 1',
        isActive: true,
        twoFactorSecret: secret,
        failedLoginCount: 0,
        lockedUntil: null,
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token-1')
        .mockResolvedValueOnce('refresh-token-1');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.verify2Fa(
        { tempToken: 'temp-mfa-token', code: validCode },
        '10.0.0.1',
      );

      expect(result.accessToken).toBe('access-token-1');
      expect(result.refreshToken).toBe('refresh-token-1');
      expect(mockAuditService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_MFA_SUCCESS',
          userId: 'staff-1',
          ipAddress: '10.0.0.1',
        }),
      );
    });

    it('should reject invalid tempToken', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

      await expect(
        service.verify2Fa({ tempToken: 'bad-token', code: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('ownerLogin', () => {
    it('should login OWNER and return mustChangePassword flag', async () => {
      const passwordHash = await bcrypt.hash('TempPass@123', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'owner-1',
        email: 'chu@coso.vn',
        passwordHash,
        fullName: 'Chủ Cơ Sở',
        role: RoleCode.OWNER,
        areaCode: null,
        isActive: true,
        mustChangePassword: true,
        failedLoginCount: 0,
        lockedUntil: null,
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('owner-access')
        .mockResolvedValueOnce('owner-refresh');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.ownerLogin(
        { email: 'chu@coso.vn', password: 'TempPass@123' },
        '172.16.0.5',
      );

      expect(result.mustChangePassword).toBe(true);
      expect(result.accessToken).toBe('owner-access');
      expect(mockAuditService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_OWNER_SUCCESS',
          entityId: 'owner-1',
        }),
      );
    });

    it('should reject internal staff logging in via owner portal', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'staff-1',
        email: 'canbo@pccc.gov.vn',
        role: RoleCode.INSPECTOR,
        isActive: true,
      });

      await expect(
        service.ownerLogin({ email: 'canbo@pccc.gov.vn', password: 'any' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh', () => {
    it('should rotate tokens when refresh token matches stored hash', async () => {
      const currentRefresh = 'valid-refresh-jwt';
      const refreshTokenHash = await bcrypt.hash(currentRefresh, 10);

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'user@pccc.gov.vn',
        role: RoleCode.LEADER,
      });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'user@pccc.gov.vn',
        fullName: 'Lãnh đạo',
        role: RoleCode.LEADER,
        areaCode: 'ALL',
        isActive: true,
        lockedUntil: null,
        refreshTokenHash,
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.refresh({ refreshToken: currentRefresh });

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            refreshTokenHash: expect.any(String),
          }),
        }),
      );
    });

    it('should reject revoked or mismatched refresh token', async () => {
      const refreshTokenHash = await bcrypt.hash('other-refresh-jwt', 10);
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        lockedUntil: null,
        refreshTokenHash,
      });

      await expect(service.refresh({ refreshToken: 'stale-refresh-jwt' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    it('should clear mustChangePassword, revoke refreshTokenHash, and audit CHANGE_PASSWORD', async () => {
      const oldHash = await bcrypt.hash('OldPass@123', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'owner-1',
        passwordHash: oldHash,
        isActive: true,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.changePassword(
        'owner-1',
        { oldPassword: 'OldPass@123', newPassword: 'NewStrongPass@456' },
        '127.0.0.1',
      );

      expect(result.message).toBe('Đổi mật khẩu thành công');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'owner-1' },
          data: expect.objectContaining({
            mustChangePassword: false,
            refreshTokenHash: null,
          }),
        }),
      );
      expect(mockAuditService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CHANGE_PASSWORD',
          entityId: 'owner-1',
        }),
      );
    });

    it('should reject when newPassword equals oldPassword', async () => {
      await expect(
        service.changePassword('owner-1', {
          oldPassword: 'SamePass@123',
          newPassword: 'SamePass@123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
