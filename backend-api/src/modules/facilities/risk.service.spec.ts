import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RiskLevelCode, RoleCode } from '@prisma/client';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RiskService } from './risk.service';

describe('RiskService (FR-03 Trigger & Trend Chart Engine)', () => {
  let service: RiskService;
  let prisma: PrismaService;
  let auditService: AuditService;

  const mockPrisma = {
    facility: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    inspection: {
      findUnique: jest.fn(),
    },
    violation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    riskScoreHistory: {
      create: jest.fn(),
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
        RiskService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<RiskService>(RiskService);
    prisma = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRiskLevel', () => {
    it('should classify score boundaries correctly (0-34 LOW, 35-64 MEDIUM, 65-100 HIGH)', () => {
      expect(service.calculateRiskLevel(0)).toBe(RiskLevelCode.LOW);
      expect(service.calculateRiskLevel(34)).toBe(RiskLevelCode.LOW);
      expect(service.calculateRiskLevel(35)).toBe(RiskLevelCode.MEDIUM);
      expect(service.calculateRiskLevel(64)).toBe(RiskLevelCode.MEDIUM);
      expect(service.calculateRiskLevel(65)).toBe(RiskLevelCode.HIGH);
      expect(service.calculateRiskLevel(100)).toBe(RiskLevelCode.HIGH);
    });
  });

  describe('TRIGGER 1: onInspectionApproved (Tăng điểm khi Leader duyệt PC03)', () => {
    const mockFacility = {
      id: 'fac-1',
      riskScore: 40,
      riskLevel: RiskLevelCode.MEDIUM,
      violations: [
        { id: 'vio-1', severity: 'CRITICAL', status: 'OPEN' }, // +15đ
        { id: 'vio-2', severity: 'MAJOR', status: 'OPEN' },    // +8đ
        { id: 'vio-3', severity: 'MAJOR', status: 'OPEN' },    // +8đ (Tổng +31đ)
      ],
    };

    const mockInspection = {
      id: 'insp-1',
      result: 'FAILED',
      status: 'APPROVED',
    };

    it('should increase risk score, change level to HIGH, and log RiskScoreHistory on approve', async () => {
      mockPrisma.facility.findUnique.mockResolvedValue(mockFacility);
      mockPrisma.inspection.findUnique.mockResolvedValue(mockInspection);

      const mockHistoryRecord = {
        id: 'hist-1',
        facilityId: 'fac-1',
        inspectionId: 'insp-1',
        scoreBefore: 40,
        scoreAfter: 71,
        triggerEvent: 'INSPECTION_APPROVED',
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          facility: { update: jest.fn().mockResolvedValue({}) },
          riskScoreHistory: { create: jest.fn().mockResolvedValue(mockHistoryRecord) },
        });
      });

      const result = await service.onInspectionApproved('fac-1', 'insp-1', 'leader-1');

      expect(result.scoreBefore).toBe(40);
      expect(result.scoreAfter).toBe(71); // 40 + 15 + 8 + 8 = 71
      expect(result.riskLevel).toBe(RiskLevelCode.HIGH);
      expect(result.riskScoreHistoryId).toBe('hist-1');

      expect(mockAudit.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INSPECTION_APPROVED_RISK_UPDATE',
          entity: 'FACILITY',
          entityId: 'fac-1',
        }),
      );
    });
  });

  describe('TRIGGER 2: onViolationResolved (Giảm điểm khi Cán bộ nghiệm thu RESOLVED)', () => {
    const mockFacility = {
      id: 'fac-1',
      riskScore: 70,
      riskLevel: RiskLevelCode.HIGH,
    };

    const mockViolation = {
      id: 'vio-1',
      facilityId: 'fac-1',
      inspectionId: 'insp-1',
      severity: 'CRITICAL',
      status: 'FIXING',
    };

    it('should deduct penalty score, lower risk level to MEDIUM, and log RiskScoreHistory on resolve', async () => {
      mockPrisma.facility.findUnique.mockResolvedValue(mockFacility);
      mockPrisma.violation.findUnique.mockResolvedValue(mockViolation);

      const mockHistoryRecord = {
        id: 'hist-2',
        facilityId: 'fac-1',
        inspectionId: 'insp-1',
        scoreBefore: 70,
        scoreAfter: 40,
        triggerEvent: 'VIOLATION_RESOLVED',
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          violation: { update: jest.fn().mockResolvedValue({}) },
          facility: { update: jest.fn().mockResolvedValue({}) },
          riskScoreHistory: { create: jest.fn().mockResolvedValue(mockHistoryRecord) },
        });
      });

      const result = await service.onViolationResolved('fac-1', 'vio-1', 'inspector-1', {
        deduction: 30,
        resolutionNote: 'Đã bổ sung bình chữa cháy đạt kiểm định',
      });

      expect(result.scoreBefore).toBe(70);
      expect(result.scoreAfter).toBe(40); // 70 - 30 = 40
      expect(result.riskLevel).toBe(RiskLevelCode.MEDIUM); // Hạ từ HIGH về MEDIUM
      expect(result.riskScoreHistoryId).toBe('hist-2');

      expect(mockAudit.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'VIOLATION_RESOLVED_RISK_UPDATE',
          entity: 'VIOLATION',
          entityId: 'vio-1',
        }),
      );
    });
  });

  describe('getRiskScoreHistories (IDOR & Scope Enforcement)', () => {
    const facilityRecord = {
      id: 'fac-q1',
      district: 'Quận 1',
      ownerUserId: 'owner-1',
      assignedInspectorId: 'inspector-q1',
    };

    it('should throw NotFoundException when facility does not exist', async () => {
      mockPrisma.facility.findFirst.mockResolvedValue(null);

      const admin: AuthenticatedUser = {
        id: 'admin-1',
        email: 'admin@pccc.gov.vn',
        role: RoleCode.ADMIN,
        fullName: 'Admin',
      };

      await expect(service.getRiskScoreHistories('missing-fac', admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject OWNER accessing another owner facility risk history', async () => {
      mockPrisma.facility.findFirst.mockResolvedValue(facilityRecord);

      const otherOwner: AuthenticatedUser = {
        id: 'owner-2',
        email: 'other@example.com',
        role: RoleCode.OWNER,
        fullName: 'Other Owner',
      };

      await expect(service.getRiskScoreHistories('fac-q1', otherOwner)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject INSPECTOR accessing facility outside their area (Quận 1 vs Quận 10)', async () => {
      mockPrisma.facility.findFirst.mockResolvedValue({
        ...facilityRecord,
        district: 'Quận 10',
        assignedInspectorId: 'other-inspector',
      });

      const inspectorQ1: AuthenticatedUser = {
        id: 'inspector-q1',
        email: 'cb@pccc.gov.vn',
        role: RoleCode.INSPECTOR,
        areaCode: 'Quận 1',
        fullName: 'CB Q1',
      };

      await expect(service.getRiskScoreHistories('fac-q1', inspectorQ1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return chronological risk history for authorized OWNER', async () => {
      mockPrisma.facility.findFirst.mockResolvedValue(facilityRecord);
      mockPrisma.riskScoreHistory.findMany.mockResolvedValue([
        { id: 'hist-1', scoreBefore: 40, scoreAfter: 70 },
      ]);

      const owner: AuthenticatedUser = {
        id: 'owner-1',
        email: 'owner1@example.com',
        role: RoleCode.OWNER,
        fullName: 'Owner 1',
      };

      const histories = await service.getRiskScoreHistories('fac-q1', owner);
      expect(histories).toHaveLength(1);
      expect(mockPrisma.riskScoreHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { facilityId: 'fac-q1' },
          orderBy: { recordedAt: 'asc' },
        }),
      );
    });
  });
});
