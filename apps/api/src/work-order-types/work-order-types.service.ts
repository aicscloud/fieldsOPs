import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkOrderTypeDto } from './dto/create-work-order-type.dto';
import { UpdateWorkOrderTypeDto } from './dto/update-work-order-type.dto';

@Injectable()
export class WorkOrderTypesService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthUser, opts?: { q?: string; take?: number }) {
    const take =
      opts?.take != null
        ? Math.min(Math.max(opts.take, 1), 100)
        : undefined;
    const q = opts?.q?.trim();
    return this.prisma.workOrderType.findMany({
      where: {
        organizationId: user.organizationId,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      ...(take != null ? { take } : {}),
    });
  }

  create(user: AuthUser, dto: CreateWorkOrderTypeDto) {
    return this.prisma.workOrderType.create({
      data: {
        organizationId: user.organizationId,
        ...dto,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateWorkOrderTypeDto) {
    await this.ensureOwned(user, id);
    return this.prisma.workOrderType.update({ where: { id }, data: dto });
  }

  private async ensureOwned(user: AuthUser, id: string) {
    const type = await this.prisma.workOrderType.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!type) throw new NotFoundException('Work order type not found');
    return type;
  }
}
