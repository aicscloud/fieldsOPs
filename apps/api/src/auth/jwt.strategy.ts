import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, FieldOpsJwtPayload, PLATFORM_ADMIN_ROLE } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: FieldOpsJwtPayload): Promise<AuthUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    if (payload.role === PLATFORM_ADMIN_ROLE) {
      const admin = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!admin?.platformAdmin || admin.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Session is no longer valid');
      }
      return {
        userId: admin.id,
        organizationId: '',
        email: admin.email,
        role: PLATFORM_ADMIN_ROLE,
      };
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: payload.organizationId,
          userId: payload.sub,
        },
      },
      include: { user: true },
    });

    if (
      !membership ||
      membership.user.status !== UserStatus.ACTIVE ||
      membership.role !== payload.role
    ) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    return {
      userId: membership.userId,
      organizationId: membership.organizationId,
      email: membership.user.email,
      role: membership.role,
    };
  }
}
