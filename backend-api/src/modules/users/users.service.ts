import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { isAreaAllowed, normalizeNfc, parseAreaCodes } from '../../common/utils/area.util';
import { AuditService } from '../audit/audit.service';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { ProvisionOwnerDto } from './dto/provision-owner.dto';
import { QueryUsersDto } from './dto/query-users.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Sinh mật khẩu tạm ngẫu nhiên an toàn gồm chữ hoa, chữ thường, số và ký tự đặc biệt
   */
  private generateSecurePassword(length = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }
    return password;
  }

  /**
   * API Cấp phát tài khoản Chủ cơ sở (Identity Provisioning - FR-01)
   * Chỉ ADMIN hoặc INSPECTOR phụ trách cơ sở mới được quyền cấp phát.
   * Ngăn chặn hoàn toàn việc người dùng tự đăng ký (Zero Self-Registration).
   */
  async provisionOwner(
    currentUser: AuthenticatedUser,
    dto: ProvisionOwnerDto,
    ipAddress?: string,
  ) {
    // 1. Kiểm tra vai trò người gọi
    if (
      currentUser.role !== RoleCode.ADMIN &&
      currentUser.role !== RoleCode.LEADER &&
      currentUser.role !== RoleCode.INSPECTOR
    ) {
      throw new ForbiddenException('Chỉ Cán bộ kiểm tra, Lãnh đạo hoặc Quản trị viên mới có quyền cấp tài khoản cơ sở');
    }

    // 2. Kiểm tra sự tồn tại của cơ sở
    const facility = await this.prisma.facility.findFirst({
      where: {
        id: dto.facilityId,
        deletedAt: null,
      },
    });

    if (!facility) {
      throw new NotFoundException('Không tìm thấy cơ sở hoặc cơ sở đã bị xóa');
    }

    // 3. Kiểm tra kiểm soát phạm vi dữ liệu (IDOR Prevention)
    if (currentUser.role === RoleCode.INSPECTOR) {
      const isAssigned = facility.assignedInspectorId === currentUser.id;
      const isAllowedArea = isAreaAllowed(currentUser.areaCode, facility.district, currentUser.role);

      if (!isAssigned && !isAllowedArea) {
        throw new ForbiddenException(
          'Bạn không có quyền cấp tài khoản cho cơ sở nằm ngoài địa bàn hoặc cơ sở chưa được phân công',
        );
      }
    } else if (currentUser.role === RoleCode.LEADER && currentUser.areaCode && !currentUser.areaCode.includes('ALL')) {
      const isAllowedArea = isAreaAllowed(currentUser.areaCode, facility.district, currentUser.role);
      if (!isAllowedArea) {
        throw new ForbiddenException(
          'Lãnh đạo không có quyền cấp tài khoản cho cơ sở nằm ngoài địa bàn phụ trách',
        );
      }
    }

    // 4. Kiểm tra email đã tồn tại hay chưa
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng trên hệ thống');
    }

    // 5. Chuẩn bị số điện thoại (hỗ trợ cả phone lẫn phoneNumber alias) & mật khẩu tạm
    const resolvedPhone = dto.phone?.trim() || dto.phoneNumber?.trim() || null;
    const temporaryPassword = dto.temporaryPassword || this.generateSecurePassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    // 6. Thực hiện giao dịch tạo User và gán vào Cơ sở
    const newUser = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          fullName: dto.fullName.trim(),
          phone: resolvedPhone,
          role: RoleCode.OWNER,
          isActive: true,
          mustChangePassword: true, // Bắt buộc đổi mật khẩu lần đầu đăng nhập
          provisionedById: currentUser.id,
        },
      });

      await tx.facility.update({
        where: { id: facility.id },
        data: {
          ownerUserId: createdUser.id,
          ownerName: dto.fullName.trim(),
          ownerPhone: resolvedPhone || facility.ownerPhone,
          ownerEmail: dto.email.toLowerCase().trim(),
        },
      });

      return createdUser;
    });

    // 7. Ghi Audit Log cho sự kiện cấp phát định danh
    await this.auditService.createLog({
      userId: currentUser.id,
      action: 'PROVISION_OWNER',
      entity: 'USER',
      entityId: newUser.id,
      afterData: {
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        facilityId: facility.id,
        facilityCode: facility.code,
        facilityName: facility.name,
      },
      ipAddress,
    });

    return {
      message: 'Cấp phát tài khoản chủ cơ sở thành công',
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        phone: newUser.phone,
        role: newUser.role,
        mustChangePassword: newUser.mustChangePassword,
        createdAt: newUser.createdAt,
      },
      temporaryPassword,
      facility: {
        id: facility.id,
        code: facility.code,
        name: facility.name,
        district: facility.district,
      },
    };
  }

  /**
   * Tạo tài khoản Cán bộ nội bộ (Chỉ ADMIN)
   */
  async createStaffUser(
    currentUser: AuthenticatedUser,
    dto: CreateStaffUserDto,
    ipAddress?: string,
  ) {
    if (currentUser.role !== RoleCode.ADMIN) {
      throw new ForbiddenException('Chỉ ADMIN mới có quyền tạo tài khoản cán bộ nội bộ');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng trên hệ thống');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const normalizedArea = dto.areaCode
      ? parseAreaCodes(dto.areaCode).join(',')
      : null;

    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() || null,
        role: dto.role,
        areaCode: normalizedArea,
        isActive: true,
        mustChangePassword: true,
        isTwoFactorEnabled: true, // Cán bộ bắt buộc bật 2FA
        provisionedById: currentUser.id,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        areaCode: true,
        isActive: true,
        isTwoFactorEnabled: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    await this.auditService.createLog({
      userId: currentUser.id,
      action: 'CREATE_STAFF_USER',
      entity: 'USER',
      entityId: newUser.id,
      afterData: newUser,
      ipAddress,
    });

    return newUser;
  }

  /**
   * Danh sách người dùng theo phạm vi và phân quyền
   */
  async findAll(currentUser: AuthenticatedUser, query: QueryUsersDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 20);
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.role) {
      where.role = query.role;
    }

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Áp dụng giới hạn địa bàn cho LEADER
    if (currentUser.role === RoleCode.LEADER && currentUser.areaCode && !currentUser.areaCode.includes('ALL')) {
      const allowedAreas = parseAreaCodes(currentUser.areaCode);
      where.areaCode = { in: allowedAreas };
    }

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          areaCode: true,
          isActive: true,
          isTwoFactorEnabled: true,
          mustChangePassword: true,
          failedLoginCount: true,
          lockedUntil: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          provisionedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          ownedFacilities: {
            select: {
              id: true,
              code: true,
              name: true,
              district: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Tìm người dùng theo ID
   */
  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        areaCode: true,
        isActive: true,
        isTwoFactorEnabled: true,
        mustChangePassword: true,
        failedLoginCount: true,
        lockedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        ownedFacilities: {
          select: {
            id: true,
            code: true,
            name: true,
            district: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return user;
  }

  /**
   * Cập nhật trạng thái khóa/mở khóa tài khoản
   */
  async updateStatus(
    currentUser: AuthenticatedUser,
    id: string,
    isActive: boolean,
    ipAddress?: string,
  ) {
    if (currentUser.role !== RoleCode.ADMIN) {
      throw new ForbiddenException('Chỉ Quản trị viên mới được thay đổi trạng thái tài khoản');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        isActive,
        // Nếu mở khóa, xóa luôn trạng thái khóa tạm
        lockedUntil: isActive ? null : user.lockedUntil,
        failedLoginCount: isActive ? 0 : user.failedLoginCount,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lockedUntil: true,
      },
    });

    await this.auditService.createLog({
      userId: currentUser.id,
      action: isActive ? 'UNLOCK_USER' : 'LOCK_USER',
      entity: 'USER',
      entityId: id,
      beforeData: { isActive: user.isActive, lockedUntil: user.lockedUntil },
      afterData: { isActive: updated.isActive, lockedUntil: updated.lockedUntil },
      ipAddress,
    });

    return updated;
  }

  /**
   * Reset mật khẩu người dùng
   */
  async resetPassword(currentUser: AuthenticatedUser, id: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (currentUser.role !== RoleCode.ADMIN && user.provisionedById !== currentUser.id) {
      throw new ForbiddenException('Bạn không có quyền đặt lại mật khẩu cho tài khoản này');
    }

    const temporaryPassword = this.generateSecurePassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    await this.auditService.createLog({
      userId: currentUser.id,
      action: 'RESET_PASSWORD',
      entity: 'USER',
      entityId: id,
      ipAddress,
    });

    return {
      message: 'Đặt lại mật khẩu thành công',
      temporaryPassword,
    };
  }
}

