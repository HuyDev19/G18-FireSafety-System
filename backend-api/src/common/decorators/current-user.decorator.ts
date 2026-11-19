import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RoleCode } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: RoleCode;
  areaCode?: string | null;
  fullName: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

