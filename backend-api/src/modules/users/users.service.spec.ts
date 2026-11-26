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

    it('should allow LEADER to provision owner account and accept phoneNumber alias', async () => {
      const leaderUser: AuthenticatedUser = {
        id: 'leader-1',
        email: 'lanhdao@pccc.gov.vn',
        role: RoleCode.LEADER,
        areaCode: 'ALL',
        fullName: 'Lãnh đạo Trần',
      };

      mockPrisma.facility.findFirst.mockResolvedValue(targetFacility);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const createdUserMock = {
        id: 'user-new-leader',
        email: 'owner_leader@example.com',
        fullName: 'Chủ do Lãnh đạo cấp',
        phone: '0901112233',
        role: RoleCode.OWNER,
        mustChangePassword: true,
        provisionedById: leaderUser.id,
        createdAt: new Date(),
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          user: { create: jest.fn().mockResolvedValue(createdUserMock) },
          facility: { update: jest.fn().mockResolvedValue(targetFacility) },
        });
      });

      const result = await service.provisionOwner(
        leaderUser,
        {
          email: 'owner_leader@example.com',
          fullName: 'Chủ do Lãnh đạo cấp',
          phoneNumber: '0901112233', // test phoneNumber alias
          facilityId: 'fac-1',
        },
        '10.0.0.1',
      );

      expect(result.user.email).toBe('owner_leader@example.com');
      expect(result.user.role).toBe(RoleCode.OWNER);
      expect(mockAudit.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROVISION_OWNER',
          userId: leaderUser.id,
        }),
      );
    });
  });

  describe('findAll (Area Scope & Filters)', () => {
    it('should apply area scope filter for scoped LEADER (including ownedFacilities)', async () => {
      const scopedLeader: AuthenticatedUser = {
        id: 'leader-q1',
        email: 'leader.q1@pccc.gov.vn',
        role: RoleCode.LEADER,
        areaCode: 'Quận 1, Quận 3',
        fullName: 'Lãnh đạo Q1-Q3',
      };

      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-q1' }]);

      const result = await service.findAll(scopedLeader, { page: 1, limit: 10 });

      expect(result.meta.total).toBe(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([
              { deletedAt: null },
              {
                OR: [
                  { areaCode: { in: ['Quận 1', 'Quận 3'] } },
                  {
                    ownedFacilities: {
                      some: { district: { in: ['Quận 1', 'Quận 3'] }, deletedAt: null },
                    },
                  },
                ],
              },
            ]),
          },
        }),
      );
    });

    it('should filter by query.areaCode when provided', async () => {
      const adminUser: AuthenticatedUser = {
        id: 'admin-1',
        email: 'admin@pccc.gov.vn',
        role: RoleCode.ADMIN,
        fullName: 'Admin',
      };

      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.findAll(adminUser, { page: 1, limit: 20, areaCode: 'Quận 10' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([
              {
                OR: [
                  { areaCode: { in: ['Quận 10'] } },
                  {
                    ownedFacilities: {
                      some: { district: { in: ['Quận 10'] }, deletedAt: null },
                    },
                  },
                ],
              },
            ]),
          },
        }),
      );
    });
  });

  describe('findById (IDOR Prevention)', () => {
    const inspectorQ1: AuthenticatedUser = {
      id: 'inspector-1',
      email: 'canbo@pccc.gov.vn',
      role: RoleCode.INSPECTOR,
      areaCode: 'Quận 1',
      fullName: 'Cán bộ Q1',
    };

    it('should reject INSPECTOR viewing user outside their area and not provisioned by them', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'owner-q10',
        email: 'owner.q10@example.com',
        role: RoleCode.OWNER,
        provisionedById: 'other-inspector',
        ownedFacilities: [
          {
            id: 'fac-q10',
            code: 'CS-Q10',
            name: 'Cơ sở Quận 10',
            district: 'Quận 10',
            assignedInspectorId: 'other-inspector',
          },
        ],
      });

      await expect(service.findById(inspectorQ1, 'owner-q10')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow INSPECTOR viewing owner whose facility is in their area', async () => {
      const targetUser = {
        id: 'owner-q1',
        email: 'owner.q1@example.com',
        role: RoleCode.OWNER,
        provisionedById: 'admin-1',
        ownedFacilities: [
          {
            id: 'fac-q1',
            code: 'CS-Q1',
            name: 'Cơ sở Quận 1',
            district: 'Quận 1',
            assignedInspectorId: 'other-inspector',
          },
        ],
      };
      mockPrisma.user.findFirst.mockResolvedValue(targetUser);

      const result = await service.findById(inspectorQ1, 'owner-q1');
      expect(result.id).toBe('owner-q1');
    });
  });

  describe('updateStatus & resetPassword', () => {
    const adminUser: AuthenticatedUser = {
      id: 'admin-1',
      email: 'admin@pccc.gov.vn',
      role: RoleCode.ADMIN,
      fullName: 'Admin',
    };

    it('should lock user, revoke refreshTokenHash, and create LOCK_USER audit log', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-2',
        isActive: true,
        lockedUntil: null,
        failedLoginCount: 0,
        refreshTokenHash: 'hashed-refresh',
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-2',
        email: 'u2@example.com',
        fullName: 'User 2',
        role: RoleCode.OWNER,
        isActive: false,
        lockedUntil: null,
      });

      const updated = await service.updateStatus(adminUser, 'user-2', false, '127.0.0.1');

      expect(updated.isActive).toBe(false);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
            refreshTokenHash: null,
          }),
        }),
      );
      expect(mockAudit.createLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOCK_USER', entityId: 'user-2' }),
      );
    });

    it('should reset password, set mustChangePassword=true, revoke refreshTokenHash, and reject unauthorized inspector', async () => {
      const otherInspector: AuthenticatedUser = {
        id: 'inspector-2',
        email: 'cb2@pccc.gov.vn',
        role: RoleCode.INSPECTOR,
        fullName: 'CB 2',
      };

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'owner-1',
        provisionedById: 'inspector-1',
      });

      await expect(
        service.resetPassword(otherInspector, 'owner-1'),
      ).rejects.toThrow(ForbiddenException);

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'owner-1',
        provisionedById: 'inspector-1',
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.resetPassword(adminUser, 'owner-1', '127.0.0.1');
      expect(result.temporaryPassword).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mustChangePassword: true,
            refreshTokenHash: null,
            failedLoginCount: 0,
            lockedUntil: null,
          }),
        }),
      );
    });
  });
});

