import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('AuditService (FR-12 Security Audit Log)', () => {
  let service: AuditService;
  let prisma: PrismaService;

  const mockPrisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should redact sensitive fields before creating audit log', async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

    const rawData = {
      username: 'test_admin',
      password: 'PlainSecretPassword!@#',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
      twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      nested: {
        accessToken: 'ey.abc.xyz',
        publicNote: 'Ghi chú an toàn',
      },
    };

    await service.createLog({
      userId: 'user-1',
      action: 'UPDATE_PASSWORD',
      entity: 'USER',
      entityId: 'user-1',
      beforeData: rawData,
      ipAddress: '127.0.0.1',
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
    const calledData = mockPrisma.auditLog.create.mock.calls[0][0].data;

    expect(calledData.beforeData.password).toBe('[REDACTED]');
    expect(calledData.beforeData.passwordHash).toBe('[REDACTED]');
    expect(calledData.beforeData.twoFactorSecret).toBe('[REDACTED]');
    expect(calledData.beforeData.nested.accessToken).toBe('[REDACTED]');
    expect(calledData.beforeData.nested.publicNote).toBe('Ghi chú an toàn');
    expect(calledData.ipAddress).toBe('127.0.0.1');
  });

  it('should query audit logs with pagination and filters', async () => {
    mockPrisma.auditLog.count.mockResolvedValue(1);
    mockPrisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        action: 'PROVISION_OWNER',
        entity: 'USER',
        entityId: 'user-2',
      },
    ]);

    const result = await service.getAuditLogs({
      page: 1,
      limit: 10,
      action: 'PROVISION_OWNER',
    });

    expect(result.meta.total).toBe(1);
    expect(result.data.length).toBe(1);
    expect(result.data[0].action).toBe('PROVISION_OWNER');
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { action: 'PROVISION_OWNER' },
        skip: 0,
        take: 10,
      }),
    );
  });
});

