import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  areaCode?: string | null;
  fullName: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key_pccc_g18',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        areaCode: true,
        isActive: true,
        mustChangePassword: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại hoặc đã bị xóa');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Tài khoản đang bị khóa tạm thời do sai mật khẩu');
    }

    return user;
  }
}

