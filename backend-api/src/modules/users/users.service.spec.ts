import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RoleCode } from '@prisma/client';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UsersService } from './users.service';

describe('UsersService - Identity Provisioning (FR-01)', () => {
  let service: UsersService;
  let prisma: PrismaService;
  let auditService: AuditService;

  const mockPrisma = {
    facility: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAudit = {
    createLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('provisionOwner', () => {
    const adminUser: AuthenticatedUser = {
      id: 'admin-1',
      email: 'admin@pccc.gov.vn',
      role: RoleCode.ADMIN,
      fullName: 'Quản trị viên',
    };

    const inspectorUser: AuthenticatedUser = {
      id: 'inspector-1',
      email: 'canbo@pccc.gov.vn',
      role: RoleCode.INSPECTOR,
      areaCode: 'Quận 1, Quận 3',
      fullName: 'Cán bộ Nguyễn',
    };

    const targetFacility = {
      id: 'fac-1',
      code: 'CS-HCM-0001',
      name: 'Tòa nhà Landmark 81',
      district: 'Quận 1',
      assignedInspectorId: 'inspector-1',
      ownerPhone: '0909999999',
    };

    it('should reject if caller is not ADMIN or INSPECTOR (e.g. OWNER)', async () => {
      const ownerCaller: AuthenticatedUser = {
        id: 'owner-1',
        email: 'owner@example.com',
        role: RoleCode.OWNER,
        fullName: 'Chủ cơ sở',
      };

      await expect(
        service.provisionOwner(ownerCaller, {
          email: 'new_owner@example.com',
          fullName: 'Chủ mới',
          facilityId: 'fac-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if facility does not exist', async () => {
      mockPrisma.facility.findFirst.mockResolvedValue(null);

      await expect(
        service.provisionOwner(adminUser, {
          email: 'owner@example.com',
          fullName: 'Chủ',
          facilityId: 'fac-none',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if INSPECTOR tries to provision facility outside their scope (IDOR)', async () => {
      const outsideFacility = {
        id: 'fac-outside',
        code: 'CS-HCM-0099',
        name: 'Kho Bình Tân',
        district: 'Quận Bình Tân', // Inspector only has Quận 1, Quận 3
        assignedInspectorId: 'other-inspector',
        ownerPhone: '0901111111',
      };
      mockPrisma.facility.findFirst.mockResolvedValue(outsideFacility);

      await expect(
        service.provisionOwner(inspectorUser, {
          email: 'binhtan@example.com',
          fullName: 'Chủ Kho',
          facilityId: 'fac-outside',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if email is already taken', async () => {
      mockPrisma.facility.findFirst.mockResolvedValue(targetFacility);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.provisionOwner(adminUser, {
          email: 'taken@example.com',
          fullName: 'Chủ',
          facilityId: 'fac-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully provision owner account, link facility, and create AuditLog', async () => {
      mockPrisma.facility.findFirst.mockResolvedValue(targetFacility);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const createdUserMock = {
        id: 'user-new-1',
        email: 'owner@example.com',
        fullName: 'Nguyễn Văn Chủ',
        phone: '0908888888',
        role: RoleCode.OWNER,
        mustChangePassword: true,
        provisionedById: adminUser.id,
        createdAt: new Date(),
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          user: { create: jest.fn().mockResolvedValue(createdUserMock) },
          facility: { update: jest.fn().mockResolvedValue(targetFacility) },
        });
      });

      const result = await service.provisionOwner(
        adminUser,
        {
          email: 'owner@example.com',
          fullName: 'Nguyễn Văn Chủ',
          phone: '0908888888',
          facilityId: 'fac-1',
        },
        '192.168.1.1',
      );

      expect(result.user.email).toBe('owner@example.com');
      expect(result.user.role).toBe(RoleCode.OWNER);
      expect(result.user.mustChangePassword).toBe(true);
      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(8);
      expect(mockAudit.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROVISION_OWNER',
          entity: 'USER',
          entityId: 'user-new-1',
          ipAddress: '192.168.1.1',
        }),
      );
    });
  });
});

