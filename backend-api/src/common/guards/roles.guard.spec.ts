import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard (RBAC Protection)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user?: any): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ role: RoleCode.OWNER });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has the required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RoleCode.ADMIN, RoleCode.INSPECTOR]);
    const context = createMockContext({ role: RoleCode.INSPECTOR });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user has wrong role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([RoleCode.ADMIN, RoleCode.LEADER]);
    const context = createMockContext({ role: RoleCode.OWNER });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'Bạn không có quyền thực hiện thao tác này',
    );
  });

  it('should throw ForbiddenException if user is not in request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RoleCode.ADMIN]);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Yêu cầu xác thực tài khoản');
  });
});

