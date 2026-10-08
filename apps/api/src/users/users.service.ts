import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole, TeamGroup, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthUser,
    opts?: { q?: string; take?: number; role?: MembershipRole },
  ) {
    const take =
      opts?.take != null
        ? Math.min(Math.max(opts.take, 1), 50)
        : undefined;
    const q = opts?.q?.trim();
    const memberships = await this.prisma.membership.findMany({
      where: {
        organizationId: user.organizationId,
        ...(opts?.role ? { role: opts.role } : {}),
        ...(q
          ? {
              user: {
                OR: [
                  { firstName: { contains: q, mode: 'insensitive' } },
                  { lastName: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      include: { user: true, group: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      ...(take != null ? { take } : {}),
    });

    return memberships.map((m) => ({
      membershipId: m.id,
      role: m.role,
      team: m.team,
      group: m.group,
      ...this.sanitize(m.user),
    }));
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    if (dto.role === MembershipRole.OWNER && actor.role !== MembershipRole.OWNER) {
      throw new BadRequestException('Only an owner can create another owner');
    }

    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const tempPassword = dto.password ?? randomBytes(9).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const groupId = await this.resolveGroupId(actor.organizationId, dto.groupId);

    const created = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          passwordHash,
          status: dto.password ? UserStatus.ACTIVE : UserStatus.INVITED,
        },
      });

      const membership = await tx.membership.create({
        data: {
          organizationId: actor.organizationId,
          userId: newUser.id,
          role: dto.role,
          team: dto.team ?? TeamGroup.FIELD,
          groupId,
        },
        include: { group: { select: { id: true, name: true } } },
      });

      return { newUser, membership };
    });

    return {
      ...this.sanitize(created.newUser),
      role: created.membership.role,
      team: created.membership.team,
      group: created.membership.group,
      temporaryPassword: dto.password ? undefined : tempPassword,
    };
  }

  async update(actor: AuthUser, userId: string, dto: UpdateUserDto) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: actor.organizationId,
          userId,
        },
      },
      include: { user: true },
    });

    if (!membership) {
      throw new NotFoundException('User not found in organization');
    }

    if (
      dto.role === MembershipRole.OWNER &&
      actor.role !== MembershipRole.OWNER
    ) {
      throw new BadRequestException('Only an owner can assign owner role');
    }

    const groupId = await this.resolveGroupId(actor.organizationId, dto.groupId);

    const [updatedUser, updatedMembership] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          photoUrl: dto.photoUrl,
          status: dto.status,
        },
      }),
      this.prisma.membership.update({
        where: { id: membership.id },
        data: {
          role: dto.role,
          ...(dto.team ? { team: dto.team } : {}),
          ...(groupId !== undefined ? { groupId } : {}),
        },
        include: { group: { select: { id: true, name: true } } },
      }),
    ]);

    return {
      ...this.sanitize(updatedUser),
      role: updatedMembership.role,
      team: updatedMembership.team,
      group: updatedMembership.group,
    };
  }

  async suspend(actor: AuthUser, userId: string) {
    if (actor.userId === userId) {
      throw new BadRequestException('You cannot suspend yourself');
    }

    return this.update(actor, userId, { status: UserStatus.SUSPENDED });
  }

  private async resolveGroupId(
    organizationId: string,
    groupId?: string | null,
  ) {
    if (groupId === undefined) return undefined;
    if (!groupId) return null;
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, organizationId },
      select: { id: true },
    });
    if (!group) throw new BadRequestException('Groupe introuvable');
    return group.id;
  }

  private sanitize(user: {
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
}
