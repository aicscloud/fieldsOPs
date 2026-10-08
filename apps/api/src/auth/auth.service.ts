import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MembershipRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, FieldOpsJwtPayload } from './auth.types';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const country = dto.country.toUpperCase();

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          country,
          currency: dto.currency ?? this.defaultCurrency(country),
          timezone: dto.timezone ?? this.defaultTimezone(country),
          language: dto.language ?? 'fr',
          email: dto.email.toLowerCase(),
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.membership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: MembershipRole.OWNER,
        },
      });

      await tx.workOrderCounter.create({
        data: { organizationId: organization.id, lastNumber: 0 },
      });

      const defaultTypes = [
        'Installation',
        'Maintenance',
        'Réparation',
        'Inspection',
        'Livraison',
        'Dépannage',
        'Relevé',
        'Intervention IT',
      ];
      await tx.workOrderType.createMany({
        data: defaultTypes.map((name) => ({
          organizationId: organization.id,
          name,
          defaultDuration: 60,
        })),
      });

      return { organization, user };
    });

    const tokens = await this.issueTokens({
      userId: result.user.id,
      organizationId: result.organization.id,
      email: result.user.email,
      role: MembershipRole.OWNER,
    });

    return {
      user: this.sanitizeUser(result.user),
      organization: result.organization,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { memberships: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException('No organization membership');
    }

    const tokens = await this.issueTokens({
      userId: user.id,
      organizationId: membership.organizationId,
      email: user.email,
      role: membership.role,
    });

    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: membership.organizationId },
    });

    return {
      user: this.sanitizeUser(user),
      organization,
      role: membership.role,
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    let payload: FieldOpsJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<FieldOpsJwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      stored.userId !== payload.sub
    ) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens({
      userId: payload.sub,
      organizationId: payload.organizationId,
      email: payload.email,
      role: payload.role,
    });
  }

  async logout(user: AuthUser, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, userId: user.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId: user.userId,
          organizationId: user.organizationId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  async me(user: AuthUser) {
    const [dbUser, organization, membership] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } }),
      this.prisma.organization.findUniqueOrThrow({
        where: { id: user.organizationId },
      }),
      this.prisma.membership.findUniqueOrThrow({
        where: {
          organizationId_userId: {
            organizationId: user.organizationId,
            userId: user.userId,
          },
        },
      }),
    ]);

    return {
      user: this.sanitizeUser(dbUser),
      organization,
      role: membership.role,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { memberships: true },
    });

    // Always return success to avoid email enumeration
    if (!user) {
      return {
        success: true,
        message: 'If the email exists, a reset link has been generated',
      };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        organizationId: user.memberships[0]?.organizationId,
        tokenHash,
        expiresAt,
      },
    });

    // Email provider not wired in MVP scaffold — return token for local/dev use
    return {
      success: true,
      message: 'If the email exists, a reset link has been generated',
      resetToken: process.env.NODE_ENV === 'production' ? undefined : rawToken,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  private async issueTokens(user: AuthUser) {
    const accessPayload: FieldOpsJwtPayload = {
      sub: user.userId,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
      type: 'access',
    };
    const refreshPayload: FieldOpsJwtPayload = {
      ...accessPayload,
      type: 'refresh',
    };

    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL') ?? '7d';

    const accessToken = await this.jwt.signAsync(
      { ...accessPayload },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...refreshPayload },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    const decoded = this.jwt.decode(refreshToken) as { exp?: number };
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        organizationId: user.organizationId,
        userId: user.userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    photoUrl: string | null;
    status: UserStatus;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      photoUrl: user.photoUrl,
      status: user.status,
    };
  }

  private defaultCurrency(country: string) {
    const map: Record<string, string> = {
      CM: 'XAF',
      FR: 'EUR',
      BE: 'EUR',
      CH: 'CHF',
      GB: 'GBP',
      US: 'USD',
      CI: 'XOF',
      SN: 'XOF',
    };
    return map[country] ?? 'EUR';
  }

  private defaultTimezone(country: string) {
    const map: Record<string, string> = {
      CM: 'Africa/Douala',
      FR: 'Europe/Paris',
      BE: 'Europe/Brussels',
      CI: 'Africa/Abidjan',
      SN: 'Africa/Dakar',
      US: 'America/New_York',
    };
    return map[country] ?? 'UTC';
  }
}
