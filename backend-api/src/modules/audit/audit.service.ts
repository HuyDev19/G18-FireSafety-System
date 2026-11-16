import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueryAuditDto } from './dto/query-audit.dto';

export interface CreateAuditLogParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string | null;
}

const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'refreshTokenHash',
  'refreshToken',
  'accessToken',
  'twoFactorSecret',
  'token',
];

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Làm sạch dữ liệu nhạy cảm trước khi lưu vào AuditLog
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        clean[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        clean[key] = this.sanitizeData(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }

  /**
   * Ghi nhận một thao tác hoặc sự kiện an ninh vào bảng AuditLog
   */
  async createLog(params: CreateAuditLogParams) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          beforeData: params.beforeData ? this.sanitizeData(params.beforeData) : undefined,
          afterData: params.afterData ? this.sanitizeData(params.afterData) : undefined,
          ipAddress: params.ipAddress || null,
        },
      });
    } catch (error: any) {
      this.logger.error(`Không thể ghi AuditLog: ${error?.message}`, error?.stack);
      return null;
    }
  }

  /**
   * Truy vấn danh sách AuditLog có phân trang và bộ lọc
   */
  async getAuditLogs(query: QueryAuditDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 20);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.entity) {
      where.entity = query.entity;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.userId) {
      where.userId = query.userId;
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
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
}

