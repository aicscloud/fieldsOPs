import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    const groups = await this.prisma.group.findMany({
      where: { organizationId: user.organizationId },
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { user: { lastName: 'asc' } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return groups.map((group) => this.present(group));
  }

  async create(user: AuthUser, dto: CreateGroupDto) {
    try {
      const group = await this.prisma.group.create({
        data: {
          organizationId: user.organizationId,
          name: dto.name.trim(),
        },
        include: { memberships: { include: { user: true } } },
      });
      return this.present(group);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Un groupe porte déjà ce nom');
      }
      throw error;
    }
  }

  async remove(user: AuthUser, id: string) {
    const group = await this.prisma.group.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!group) throw new NotFoundException('Groupe introuvable');
    await this.prisma.group.delete({ where: { id: group.id } });
    return { ok: true };
  }

  async addMember(user: AuthUser, groupId: string, userId: string) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, organizationId: user.organizationId },
    });
    if (!group) throw new NotFoundException('Groupe introuvable');

    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: user.organizationId,
          userId,
        },
      },
    });
    if (!membership) throw new NotFoundException('Technicien introuvable');

    await this.prisma.membership.update({
      where: { id: membership.id },
      data: { groupId: group.id },
    });

    return this.get(user, group.id);
  }

  async removeMember(user: AuthUser, groupId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        organizationId: user.organizationId,
        userId,
        groupId,
      },
    });
    if (!membership) throw new NotFoundException('Membre introuvable');

    await this.prisma.membership.update({
      where: { id: membership.id },
      data: { groupId: null },
    });

    return this.get(user, groupId);
  }

  private async get(user: AuthUser, id: string) {
    const group = await this.prisma.group.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { user: { lastName: 'asc' } },
        },
      },
    });
    if (!group) throw new NotFoundException('Groupe introuvable');
    return this.present(group);
  }

  private present(group: {
    id: string;
    name: string;
    memberships: {
      user: { id: string; firstName: string; lastName: string };
    }[];
  }) {
    return {
      id: group.id,
      name: group.name,
      members: group.memberships.map((membership) => ({
        id: membership.user.id,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
      })),
    };
  }
}
