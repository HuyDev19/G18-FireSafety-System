import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RiskLevelCode, RoleCode } from '@prisma/client';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { isAreaAllowed, parseAreaCodes } from '../../common/utils/area.util';
import { AuditService } from '../audit/audit.service';

export interface TriggerApprovedResult {
  scoreBefore: number;
  scoreAfter: number;
  riskLevel: RiskLevelCode;
  riskScoreHistoryId: string;
}

export interface TriggerResolvedResult {
  scoreBefore: number;
  scoreAfter: number;
  riskLevel: RiskLevelCode;
  riskScoreHistoryId: string;
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Xác định mức rủi ro theo tổng điểm (0–100)
   * 0 - 34: LOW (Xanh)
   * 35 - 64: MEDIUM (Vàng)
   * 65 - 100: HIGH (Đỏ)
   */
  calculateRiskLevel(score: number): RiskLevelCode {
    if (score >= 65) return RiskLevelCode.HIGH;
    if (score >= 35) return RiskLevelCode.MEDIUM;
    return RiskLevelCode.LOW;
  }

  /**
   * TRIGGER 1: Tăng điểm rủi ro khi Lãnh đạo duyệt Biên bản kiểm tra PC03 (Inspection.status = APPROVED)
   * - Lấy các vi phạm mới sinh từ các tiêu chí FAIL thuộc biên bản
   * - Cộng điểm phạt theo khung NĐ 106/2025: CRITICAL (+15đ), MAJOR (+8đ), MINOR (+3đ)
   * - Chạm trần tối đa 100đ
   * - Cập nhật Facility.riskScore, Facility.riskLevel
   * - Tạo bản ghi RiskScoreHistory phục vụ vẽ biểu đồ xu hướng (Trend Chart)
   */
  async onInspectionApproved(
    facilityId: string,
    inspectionId: string,
    performedByUserId?: string,
    customReason?: string,
  ): Promise<TriggerApprovedResult> {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      include: {
        violations: {
          where: { inspectionId, status: 'OPEN' },
        },
      },
    });

    if (!facility) {
      throw new NotFoundException(`Không tìm thấy cơ sở có ID: ${facilityId}`);
    }

    const inspection = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
    });

    if (!inspection) {
      throw new NotFoundException(`Không tìm thấy biên bản kiểm tra có ID: ${inspectionId}`);
    }

    const scoreBefore = facility.riskScore;

    // Tính điểm phạt vi phạm
    let penaltyScore = 0;
    if (facility.violations && facility.violations.length > 0) {
      for (const v of facility.violations) {
        if (v.severity === 'CRITICAL') penaltyScore += 15;
        else if (v.severity === 'MAJOR') penaltyScore += 8;
        else penaltyScore += 3;
      }
    } else {
      // Trường hợp không có vi phạm cụ thể nhưng biên bản kết luận FAIL (mặc định demo +30đ)
      if (inspection.result === 'FAILED') {
        penaltyScore = 30;
      }
    }

    const scoreAfter = Math.min(100, Math.max(0, scoreBefore + penaltyScore));
    const newRiskLevel = this.calculateRiskLevel(scoreAfter);

    const changeReason =
      customReason ||
      `Lãnh đạo duyệt Biên bản PC03 (${inspectionId}): phát hiện ${facility.violations?.length || 0} vi phạm, tăng ${penaltyScore}đ rủi ro`;

    // Thực hiện trong transaction
    const history = await this.prisma.$transaction(async (tx) => {
      await tx.facility.update({
        where: { id: facilityId },
        data: {
          riskScore: scoreAfter,
          riskLevel: newRiskLevel,
          lastInspectedAt: new Date(),
        },
      });

      return await tx.riskScoreHistory.create({
        data: {
          facilityId,
          inspectionId,
          scoreBefore,
          scoreAfter,
          triggerEvent: 'INSPECTION_APPROVED',
          changeReason,
        },
      });
    });

    // Ghi AuditLog
    await this.auditService.createLog({
      userId: performedByUserId,
      action: 'INSPECTION_APPROVED_RISK_UPDATE',
      entity: 'FACILITY',
      entityId: facilityId,
      beforeData: { riskScore: scoreBefore, riskLevel: facility.riskLevel },
      afterData: { riskScore: scoreAfter, riskLevel: newRiskLevel, penaltyScore },
    });

    this.logger.log(
      `[TRIGGER 1 - APPROVED] Cơ sở ${facilityId}: ${scoreBefore}đ -> ${scoreAfter}đ (${newRiskLevel})`,
    );

    return {
      scoreBefore,
      scoreAfter,
      riskLevel: newRiskLevel,
      riskScoreHistoryId: history.id,
    };
  }

  /**
   * TRIGGER 2: Giảm điểm rủi ro khi Cán bộ xác nhận hoàn thành khắc phục vi phạm (Violation.status = RESOLVED)
   * - Khấu trừ điểm phạt của vi phạm đã được khắc phục ra khỏi tổng điểm rủi ro
   * - Tự động hạ mức nguy cơ (Ví dụ từ HIGH đỏ về MEDIUM vàng khi dưới 65đ)
   * - Cập nhật Violation.resolvedAt & Violation.resolutionNote
   * - Tạo bản ghi RiskScoreHistory ghi rõ lý do khắc phục phục vụ Trend Chart
   */
  async onViolationResolved(
    facilityId: string,
    violationId: string,
    performedByUserId?: string,
    options?: { deduction?: number; resolutionNote?: string },
  ): Promise<TriggerResolvedResult> {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility) {
      throw new NotFoundException(`Không tìm thấy cơ sở có ID: ${facilityId}`);
    }

    const violation = await this.prisma.violation.findUnique({
      where: { id: violationId },
    });

    if (!violation) {
      throw new NotFoundException(`Không tìm thấy vi phạm có ID: ${violationId}`);
    }

    if (violation.facilityId !== facilityId) {
      throw new BadRequestException('Vi phạm không thuộc về cơ sở này');
    }

    const scoreBefore = facility.riskScore;

    // Xác định số điểm được giảm
    let deduction = options?.deduction;
    if (deduction === undefined) {
      if (violation.severity === 'CRITICAL') deduction = 15;
      else if (violation.severity === 'MAJOR') deduction = 8;
      else deduction = 3;

      // Nếu điểm hiện tại cao do demo, cho phép trừ tương ứng
      if (scoreBefore >= 70 && scoreBefore - 30 >= 40) {
        deduction = 30;
      }
    }

    const scoreAfter = Math.max(0, scoreBefore - deduction);
    const newRiskLevel = this.calculateRiskLevel(scoreAfter);

    const resolutionNote =
      options?.resolutionNote ||
      `Cán bộ xác nhận hoàn thành khắc phục vi phạm ${violationId}, giảm ${deduction}đ rủi ro`;

    const history = await this.prisma.$transaction(async (tx) => {
      await tx.violation.update({
        where: { id: violationId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolutionNote,
        },
      });

      await tx.facility.update({
        where: { id: facilityId },
        data: {
          riskScore: scoreAfter,
          riskLevel: newRiskLevel,
        },
      });

      return await tx.riskScoreHistory.create({
        data: {
          facilityId,
          inspectionId: violation.inspectionId,
          scoreBefore,
          scoreAfter,
          triggerEvent: 'VIOLATION_RESOLVED',
          changeReason: resolutionNote,
        },
      });
    });

    // Ghi AuditLog
    await this.auditService.createLog({
      userId: performedByUserId,
      action: 'VIOLATION_RESOLVED_RISK_UPDATE',
      entity: 'VIOLATION',
      entityId: violationId,
      beforeData: {
        violationStatus: violation.status,
        facilityRiskScore: scoreBefore,
        facilityRiskLevel: facility.riskLevel,
      },
      afterData: {
        violationStatus: 'RESOLVED',
        facilityRiskScore: scoreAfter,
        facilityRiskLevel: newRiskLevel,
        deduction,
      },
    });

    this.logger.log(
      `[TRIGGER 2 - RESOLVED] Cơ sở ${facilityId}: ${scoreBefore}đ -> ${scoreAfter}đ (${newRiskLevel})`,
    );

    return {
      scoreBefore,
      scoreAfter,
      riskLevel: newRiskLevel,
      riskScoreHistoryId: history.id,
    };
  }

  /**
   * Lấy lịch sử biến động điểm rủi ro phục vụ vẽ biểu đồ Trend Chart (kèm kiểm soát IDOR)
   */
  async getRiskScoreHistories(facilityId: string, currentUser?: AuthenticatedUser) {
    if (currentUser) {
      const facility = await this.prisma.facility.findFirst({
        where: { id: facilityId, deletedAt: null },
        select: {
          id: true,
          district: true,
          ownerUserId: true,
          assignedInspectorId: true,
        },
      });

      if (!facility) {
        throw new NotFoundException(`Không tìm thấy cơ sở có ID: ${facilityId}`);
      }

      if (currentUser.role === RoleCode.OWNER && facility.ownerUserId !== currentUser.id) {
        throw new ForbiddenException('Bạn không có quyền xem lịch sử rủi ro của cơ sở khác');
      }

      if (currentUser.role === RoleCode.INSPECTOR) {
        const isAssigned = facility.assignedInspectorId === currentUser.id;
        const isAllowedArea = isAreaAllowed(
          currentUser.areaCode,
          facility.district,
          currentUser.role,
        );
        if (!isAssigned && !isAllowedArea) {
          throw new ForbiddenException(
            'Bạn không có quyền xem lịch sử rủi ro cơ sở ngoài địa bàn phụ trách',
          );
        }
      } else if (
        currentUser.role === RoleCode.LEADER &&
        currentUser.areaCode &&
        !parseAreaCodes(currentUser.areaCode).includes('ALL')
      ) {
        if (!isAreaAllowed(currentUser.areaCode, facility.district, currentUser.role)) {
          throw new ForbiddenException(
            'Lãnh đạo không có quyền xem lịch sử rủi ro cơ sở ngoài địa bàn phụ trách',
          );
        }
      }
    }

    return this.prisma.riskScoreHistory.findMany({
      where: { facilityId },
      orderBy: { recordedAt: 'asc' },
      include: {
        inspection: {
          select: {
            id: true,
            score: true,
            result: true,
            submittedAt: true,
            approvedAt: true,
          },
        },
      },
    });
  }
}
