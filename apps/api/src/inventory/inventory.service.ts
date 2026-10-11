import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EquipmentPlacement, NoteKind, Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdjustStockDto,
  CreatePartDto,
  InstallEquipmentDto,
  RemoveEquipmentDto,
  RepairEquipmentDto,
  UpdatePartDto,
  UsePartOnWorkOrderDto,
} from './dto/inventory.dto';

const installedInclude = {
  part: { select: { id: true, sku: true, name: true, unit: true, salePrice: true, unitCost: true } },
  customer: { select: { id: true, name: true } },
  site: { select: { id: true, name: true, city: true } },
  workOrder: { select: { id: true, number: true, title: true } },
} satisfies Prisma.InstalledEquipmentInclude;

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
    const quantity = dto.quantity ?? 0;
    return this.prisma.$transaction(async (tx) => {
      const part = await tx.part.create({
        data: {
          organizationId: user.organizationId,
          sku: dto.sku.trim().toUpperCase(),
          name: dto.name,
          unit: dto.unit ?? 'pcs',
          quantity,
          minQuantity: dto.minQuantity ?? 0,
          unitCost: dto.unitCost,
          salePrice: dto.salePrice ?? dto.unitCost,
        },
      });
      if (quantity > 0) {
        await tx.stockMovement.create({
          data: {
            organizationId: user.organizationId,
            partId: part.id,
            delta: quantity,
            reason: 'Stock initial',
          },
        });
      }
      return part;
    });
  }

  async updatePart(user: AuthUser, partId: string, dto: UpdatePartDto) {
    const part = await this.prisma.part.findFirst({
      where: { id: partId, organizationId: user.organizationId },
    });
    if (!part) throw new NotFoundException('Équipement introuvable');
    return this.prisma.part.update({
      where: { id: partId },
      data: {
        ...(dto.name != null ? { name: dto.name } : {}),
        ...(dto.unit != null ? { unit: dto.unit } : {}),
        ...(dto.unitCost != null ? { unitCost: dto.unitCost } : {}),
        ...(dto.salePrice != null ? { salePrice: dto.salePrice } : {}),
        ...(dto.minQuantity != null ? { minQuantity: dto.minQuantity } : {}),
      },
    });
  }

  async adjust(user: AuthUser, partId: string, dto: AdjustStockDto) {
    const part = await this.prisma.part.findFirst({
      where: { id: partId, organizationId: user.organizationId },
    });
    if (!part) throw new NotFoundException('Équipement introuvable');
    if (part.quantity + dto.delta < 0) {
      throw new BadRequestException('Stock insuffisant');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: {
          organizationId: user.organizationId,
          partId,
          delta: dto.delta,
          reason: dto.reason?.trim() || 'Ajustement',
        },
      });
      return tx.part.update({
        where: { id: partId },
        data: { quantity: { increment: dto.delta } },
      });
    });
  }

  listMovements(user: AuthUser, partId: string) {
    return this.prisma.stockMovement.findMany({
      where: { organizationId: user.organizationId, partId },
      orderBy: { createdAt: 'desc' },
      take: 40,
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
    if (!wo) throw new NotFoundException('Intervention introuvable');
    if (!part) throw new NotFoundException('Équipement introuvable');
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
          reason: `Consommé sur ${wo.number}`,
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
      include: { part: true, installed: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listInstalled(
    user: AuthUser,
    opts?: { customerId?: string; siteId?: string; status?: string; q?: string },
  ) {
    const q = opts?.q?.trim();
    const status =
      opts?.status === 'REMOVED' || opts?.status === 'INSTALLED'
        ? opts.status
        : undefined;
    return this.prisma.installedEquipment.findMany({
      where: {
        organizationId: user.organizationId,
        ...(opts?.customerId ? { customerId: opts.customerId } : {}),
        ...(opts?.siteId ? { siteId: opts.siteId } : {}),
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { serialNumber: { contains: q, mode: 'insensitive' } },
                { part: { name: { contains: q, mode: 'insensitive' } } },
                { part: { sku: { contains: q, mode: 'insensitive' } } },
                { customer: { name: { contains: q, mode: 'insensitive' } } },
                { site: { name: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: { ...installedInclude, _count: { select: { repairs: true } } },
      orderBy: { installedAt: 'desc' },
    });
  }

  async install(user: AuthUser, dto: InstallEquipmentDto, workOrderId?: string) {
    const serial = dto.serialNumber.trim().toUpperCase();
    if (!serial) throw new BadRequestException('Indiquez le numéro de série');

    const orderId = workOrderId ?? dto.workOrderId;
    const part = await this.prisma.part.findFirst({
      where: { id: dto.partId, organizationId: user.organizationId },
    });
    if (!part) throw new NotFoundException('Équipement introuvable');
    if (part.quantity < 1) throw new BadRequestException('Stock insuffisant');

    let siteId = dto.siteId;
    let customerId: string | undefined;
    if (orderId) {
      const wo = await this.prisma.workOrder.findFirst({
        where: { id: orderId, organizationId: user.organizationId },
      });
      if (!wo) throw new NotFoundException('Intervention introuvable');
      if (siteId && siteId !== wo.siteId) {
        throw new BadRequestException('Ce site ne correspond pas à l’intervention');
      }
      siteId = wo.siteId;
      customerId = wo.customerId;
    }
    if (!siteId) throw new BadRequestException('Choisissez le site du client');

    const site = await this.prisma.site.findFirst({
      where: { id: siteId, organizationId: user.organizationId },
    });
    if (!site) throw new NotFoundException('Site introuvable');
    if (customerId && customerId !== site.customerId) {
      throw new BadRequestException('Ce site n’appartient pas au client de l’intervention');
    }
    customerId = site.customerId;

    const existing = await this.prisma.installedEquipment.findFirst({
      where: { organizationId: user.organizationId, serialNumber: serial },
    });
    if (existing?.status === EquipmentPlacement.INSTALLED) {
      throw new ConflictException('Ce numéro est déjà installé chez un client');
    }

    const place = `${site.name}`;
    return this.prisma.$transaction(async (tx) => {
      const fresh = await tx.part.findFirst({
        where: { id: part.id, organizationId: user.organizationId },
      });
      if (!fresh || fresh.quantity < 1) {
        throw new BadRequestException('Stock insuffisant');
      }

      const usage = orderId
        ? await tx.workOrderPart.create({
            data: {
              organizationId: user.organizationId,
              workOrderId: orderId,
              partId: part.id,
              quantity: 1,
            },
          })
        : null;

      await tx.stockMovement.create({
        data: {
          organizationId: user.organizationId,
          partId: part.id,
          delta: -1,
          reason: `Installé ${serial} · ${place}`,
        },
      });
      await tx.part.update({
        where: { id: part.id },
        data: { quantity: { decrement: 1 } },
      });

      const data = {
        partId: part.id,
        status: EquipmentPlacement.INSTALLED,
        customerId,
        siteId: site.id,
        workOrderId: orderId,
        workOrderPartId: usage?.id,
        notes: dto.notes?.trim() || null,
        installedAt: new Date(),
        removedAt: null,
      };

      const row = existing
        ? await tx.installedEquipment.update({
            where: { id: existing.id },
            data,
            include: installedInclude,
          })
        : await tx.installedEquipment.create({
            data: {
              organizationId: user.organizationId,
              serialNumber: serial,
              ...data,
            },
            include: installedInclude,
          });
      return row;
    });
  }

  async remove(user: AuthUser, id: string, dto: RemoveEquipmentDto) {
    const row = await this.prisma.installedEquipment.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { part: true, site: true, workOrder: true },
    });
    if (!row) throw new NotFoundException('Équipement installé introuvable');
    if (row.status !== EquipmentPlacement.INSTALLED) {
      throw new BadRequestException('Cet équipement n’est plus installé');
    }

    if (dto.returnToStock && row.workOrderId) {
      const billed = await this.prisma.billingDocument.count({
        where: {
          organizationId: user.organizationId,
          workOrderId: row.workOrderId,
        },
      });
      if (billed > 0) {
        throw new BadRequestException(
          'Cette intervention est déjà facturée. Retirez la ligne de la facture avant de remettre l’équipement en stock.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.returnToStock) {
        await tx.stockMovement.create({
          data: {
            organizationId: user.organizationId,
            partId: row.partId,
            delta: 1,
            reason: `Retour stock ${row.serialNumber} · ${row.site.name}`,
          },
        });
        await tx.part.update({
          where: { id: row.partId },
          data: { quantity: { increment: 1 } },
        });
        if (row.workOrderPartId) {
          await tx.installedEquipment.update({
            where: { id: row.id },
            data: { workOrderPartId: null },
          });
          await tx.workOrderPart.delete({ where: { id: row.workOrderPartId } });
        }
      }

      return tx.installedEquipment.update({
        where: { id: row.id },
        data: {
          status: EquipmentPlacement.REMOVED,
          removedAt: new Date(),
        },
        include: installedInclude,
      });
    });
  }

  listRepairs(user: AuthUser, installedEquipmentId: string) {
    return this.prisma.equipmentRepair.findMany({
      where: { organizationId: user.organizationId, installedEquipmentId },
      include: {
        workOrder: { select: { id: true, number: true, title: true } },
        replacement: { select: { serialNumber: true, part: { select: { name: true } } } },
        parts: {
          include: {
            workOrderPart: { include: { part: { select: { name: true, sku: true, unit: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async repair(user: AuthUser, workOrderId: string, dto: RepairEquipmentDto) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId: user.organizationId },
    });
    if (!wo) throw new NotFoundException('Intervention introuvable');

    const equipment = await this.prisma.installedEquipment.findFirst({
      where: { id: dto.installedEquipmentId, organizationId: user.organizationId },
      include: { part: true, site: true },
    });
    if (!equipment) throw new NotFoundException('Équipement installé introuvable');
    if (equipment.status !== EquipmentPlacement.INSTALLED) {
      throw new BadRequestException('Cet équipement n’est plus installé');
    }
    if (equipment.siteId !== wo.siteId) {
      throw new BadRequestException('Cet équipement n’est pas sur le site de l’intervention');
    }

    const spareParts = dto.parts ?? [];
    const demand = new Map<string, number>();
    for (const line of spareParts) {
      demand.set(line.partId, (demand.get(line.partId) ?? 0) + line.quantity);
    }
    if (dto.replacement) {
      demand.set(dto.replacement.partId, (demand.get(dto.replacement.partId) ?? 0) + 1);
    }
    const stock = await this.prisma.part.findMany({
      where: { organizationId: user.organizationId, id: { in: [...demand.keys()] } },
    });
    for (const [partId, qty] of demand) {
      const part = stock.find((item) => item.id === partId);
      if (!part) throw new NotFoundException('Pièce introuvable');
      if (part.quantity < qty) {
        throw new BadRequestException(`Stock insuffisant pour ${part.name}`);
      }
    }

    const replacementSerial = dto.replacement?.serialNumber.trim().toUpperCase();
    if (replacementSerial) {
      const taken = await this.prisma.installedEquipment.findFirst({
        where: { organizationId: user.organizationId, serialNumber: replacementSerial },
      });
      if (taken?.status === EquipmentPlacement.INSTALLED) {
        throw new ConflictException('Ce numéro de remplacement est déjà installé');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const usageIds: string[] = [];
      for (const line of spareParts) {
        const usage = await tx.workOrderPart.create({
          data: {
            organizationId: user.organizationId,
            workOrderId,
            partId: line.partId,
            quantity: line.quantity,
          },
        });
        usageIds.push(usage.id);
        await tx.stockMovement.create({
          data: {
            organizationId: user.organizationId,
            partId: line.partId,
            delta: -line.quantity,
            reason: `Réparation ${equipment.serialNumber} · ${wo.number}`,
          },
        });
        await tx.part.update({
          where: { id: line.partId },
          data: { quantity: { decrement: line.quantity } },
        });
      }

      let replacementId: string | undefined;
      if (dto.replacement && replacementSerial) {
        const usage = await tx.workOrderPart.create({
          data: {
            organizationId: user.organizationId,
            workOrderId,
            partId: dto.replacement.partId,
            quantity: 1,
          },
        });
        await tx.stockMovement.create({
          data: {
            organizationId: user.organizationId,
            partId: dto.replacement.partId,
            delta: -1,
            reason: `Remplacement de ${equipment.serialNumber} · ${replacementSerial}`,
          },
        });
        await tx.part.update({
          where: { id: dto.replacement.partId },
          data: { quantity: { decrement: 1 } },
        });
        const previous = await tx.installedEquipment.findFirst({
          where: { organizationId: user.organizationId, serialNumber: replacementSerial },
        });
        const placed = {
          partId: dto.replacement.partId,
          status: EquipmentPlacement.INSTALLED,
          customerId: wo.customerId,
          siteId: wo.siteId,
          workOrderId,
          workOrderPartId: usage.id,
          installedAt: new Date(),
          removedAt: null,
          notes: `Remplace ${equipment.serialNumber}`,
        };
        const created = previous
          ? await tx.installedEquipment.update({ where: { id: previous.id }, data: placed })
          : await tx.installedEquipment.create({
              data: {
                organizationId: user.organizationId,
                serialNumber: replacementSerial,
                ...placed,
              },
            });
        replacementId = created.id;
        await tx.installedEquipment.update({
          where: { id: equipment.id },
          data: { status: EquipmentPlacement.REMOVED, removedAt: new Date() },
        });
      }

      const repair = await tx.equipmentRepair.create({
        data: {
          organizationId: user.organizationId,
          installedEquipmentId: equipment.id,
          workOrderId,
          summary: dto.summary.trim(),
          replacementId,
          parts: {
            create: usageIds.map((workOrderPartId) => ({ workOrderPartId })),
          },
        },
        include: {
          replacement: { select: { serialNumber: true } },
          parts: { include: { workOrderPart: { include: { part: true } } } },
        },
      });

      const spareText = repair.parts
        .map((line) => `${line.workOrderPart.quantity} ${line.workOrderPart.part.unit} ${line.workOrderPart.part.name}`)
        .join(', ');
      await tx.workOrderNote.create({
        data: {
          organizationId: user.organizationId,
          workOrderId,
          authorId: user.userId,
          kind: NoteKind.NOTE,
          body: [
            `Réparation ${equipment.part.name} n° ${equipment.serialNumber} : ${dto.summary.trim()}`,
            spareText ? `Pièces : ${spareText}` : '',
            replacementSerial ? `Appareil remplacé par n° ${replacementSerial}` : '',
          ].filter(Boolean).join('\n'),
        },
      });

      return repair;
    });
  }
}
