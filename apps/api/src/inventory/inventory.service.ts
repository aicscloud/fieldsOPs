import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdjustStockDto,
  CreatePartDto,
  UpdatePartDto,
  UsePartOnWorkOrderDto,
} from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  listParts(user: AuthUser, opts?: { q?: string; take?: number }) {
    const take =
      opts?.take != null
        ? Math.min(Math.max(opts.take, 1), 50)
        : undefined;
    const q = opts?.q?.trim();
    return this.prisma.part.findMany({
      where: {
        organizationId: user.organizationId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { sku: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      ...(take != null ? { take } : {}),
    });
  }

  createPart(user: AuthUser, dto: CreatePartDto) {
    return this.prisma.part.create({
      data: {
        organizationId: user.organizationId,
        sku: dto.sku.trim().toUpperCase(),
        name: dto.name,
        unit: dto.unit ?? 'pcs',
        quantity: dto.quantity ?? 0,
        minQuantity: dto.minQuantity ?? 0,
        unitCost: dto.unitCost,
      },
    });
  }

  async updatePart(
    user: AuthUser,
    partId: string,
    dto: UpdatePartDto,
  ) {
    const part = await this.prisma.part.findFirst({
      where: { id: partId, organizationId: user.organizationId },
    });
    if (!part) throw new NotFoundException('Part not found');
    return this.prisma.part.update({
      where: { id: partId },
      data: {
        ...(dto.name != null ? { name: dto.name } : {}),
        ...(dto.unit != null ? { unit: dto.unit } : {}),
        ...(dto.unitCost != null ? { unitCost: dto.unitCost } : {}),
        ...(dto.minQuantity != null ? { minQuantity: dto.minQuantity } : {}),
      },
    });
  }

  async adjust(user: AuthUser, partId: string, dto: AdjustStockDto) {
    const part = await this.prisma.part.findFirst({
      where: { id: partId, organizationId: user.organizationId },
    });
    if (!part) throw new NotFoundException('Part not found');
    if (part.quantity + dto.delta < 0) {
      throw new BadRequestException('Stock insuffisant');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: {
          organizationId: user.organizationId,
          partId,
          delta: dto.delta,
          reason: dto.reason,
        },
      });
      return tx.part.update({
        where: { id: partId },
        data: { quantity: { increment: dto.delta } },
      });
    });
  }

  async useOnWorkOrder(
    user: AuthUser,
    workOrderId: string,
    dto: UsePartOnWorkOrderDto,
  ) {
    const [wo, part] = await Promise.all([
      this.prisma.workOrder.findFirst({
        where: { id: workOrderId, organizationId: user.organizationId },
      }),
      this.prisma.part.findFirst({
        where: { id: dto.partId, organizationId: user.organizationId },
      }),
    ]);
    if (!wo) throw new NotFoundException('Work order not found');
    if (!part) throw new NotFoundException('Part not found');
    if (part.quantity < dto.quantity) {
      throw new BadRequestException('Stock insuffisant');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.workOrderPart.create({
        data: {
          organizationId: user.organizationId,
          workOrderId,
          partId: dto.partId,
          quantity: dto.quantity,
        },
      });
      await tx.stockMovement.create({
        data: {
          organizationId: user.organizationId,
          partId: dto.partId,
          delta: -dto.quantity,
          reason: `Utilisé sur ${wo.number}`,
        },
      });
      return tx.part.update({
        where: { id: dto.partId },
        data: { quantity: { decrement: dto.quantity } },
      });
    });
  }

  listUsage(user: AuthUser, workOrderId: string) {
    return this.prisma.workOrderPart.findMany({
      where: { organizationId: user.organizationId, workOrderId },
      include: { part: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
