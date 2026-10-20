import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InterventionKind,
  Prisma,
  WorkOrderStatus,
} from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { CreateContractDto, UpdateContractDto } from './dto/create-contract.dto';

const OPEN_VISIT: WorkOrderStatus[] = [
  WorkOrderStatus.DRAFT,
  WorkOrderStatus.SCHEDULED,
  WorkOrderStatus.ASSIGNED,
  WorkOrderStatus.EN_ROUTE,
  WorkOrderStatus.IN_PROGRESS,
  WorkOrderStatus.PAUSED,
];

const contractInclude = {
  customer: { select: { id: true, name: true } },
  site: { select: { id: true, name: true, city: true, address: true } },
  equipment: {
    select: {
      id: true,
      serialNumber: true,
      part: { select: { name: true, sku: true } },
    },
  },
  type: { select: { id: true, name: true, defaultDuration: true, kind: true } },
  workOrders: {
    where: { status: { in: OPEN_VISIT } },
    select: { id: true, number: true, status: true, title: true },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.MaintenanceContractInclude;

function parseDay(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) throw new BadRequestException('Date invalide');
  return new Date(year, month - 1, day, 8, 0, 0, 0);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addMonths(from: Date, months: number) {
  const next = new Date(from);
  next.setMonth(next.getMonth() + months);
  return next;
}

function dueState(nextDueAt: Date, active: boolean) {
  if (!active) return 'paused' as const;
  const today = startOfToday();
  if (nextDueAt < today) return 'overdue' as const;
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 14);
  if (nextDueAt <= soon) return 'due' as const;
  return 'ok' as const;
}

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workOrders: WorkOrdersService,
  ) {}

  async list(
    user: AuthUser,
    opts?: { customerId?: string; siteId?: string; active?: string },
  ) {
    const rows = await this.prisma.maintenanceContract.findMany({
      where: {
        organizationId: user.organizationId,
        ...(opts?.customerId ? { customerId: opts.customerId } : {}),
        ...(opts?.siteId ? { siteId: opts.siteId } : {}),
        ...(opts?.active === 'true' ? { active: true } : {}),
        ...(opts?.active === 'false' ? { active: false } : {}),
      },
      include: contractInclude,
      orderBy: [{ active: 'desc' }, { nextDueAt: 'asc' }],
    });
    return rows.map((row) => this.present(row));
  }

  async summary(user: AuthUser) {
    const rows = await this.prisma.maintenanceContract.findMany({
      where: { organizationId: user.organizationId, active: true },
      select: {
        id: true,
        nextDueAt: true,
        workOrders: {
          where: { status: { in: OPEN_VISIT } },
          select: { id: true },
          take: 1,
        },
      },
    });
    const today = startOfToday();
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 14);
    let overdue = 0;
    let due = 0;
    let openVisits = 0;
    for (const row of rows) {
      if (row.workOrders.length) openVisits += 1;
      if (row.nextDueAt < today) overdue += 1;
      else if (row.nextDueAt <= soon) due += 1;
    }
    return { overdue, due, openVisits, total: rows.length };
  }

  async get(user: AuthUser, id: string) {
    const row = await this.prisma.maintenanceContract.findFirst({
      where: { id, organizationId: user.organizationId },
      include: contractInclude,
    });
    if (!row) throw new NotFoundException('Contrat introuvable');
    return this.present(row);
  }

  async create(user: AuthUser, dto: CreateContractDto) {
    const ctx = await this.resolveScope(user, dto);
    return this.present(
      await this.prisma.maintenanceContract.create({
        data: {
          organizationId: user.organizationId,
          customerId: ctx.customerId,
          siteId: ctx.siteId,
          installedEquipmentId: ctx.installedEquipmentId,
          typeId: ctx.typeId,
          kind: ctx.kind,
          title: dto.title.trim(),
          intervalMonths: dto.intervalMonths,
          nextDueAt: parseDay(dto.nextDueAt),
          notes: dto.notes?.trim() || null,
        },
        include: contractInclude,
      }),
    );
  }

  async update(user: AuthUser, id: string, dto: UpdateContractDto) {
    const existing = await this.prisma.maintenanceContract.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Contrat introuvable');

    const ctx = await this.resolveScope(user, {
      customerId: existing.customerId,
      siteId: existing.siteId,
      installedEquipmentId:
        dto.installedEquipmentId === undefined
          ? existing.installedEquipmentId ?? undefined
          : dto.installedEquipmentId || undefined,
      typeId: dto.typeId === undefined ? existing.typeId ?? undefined : dto.typeId || undefined,
      kind: dto.kind ?? existing.kind,
    });

    return this.present(
      await this.prisma.maintenanceContract.update({
        where: { id },
        data: {
          title: dto.title?.trim(),
          intervalMonths: dto.intervalMonths,
          nextDueAt: dto.nextDueAt ? parseDay(dto.nextDueAt) : undefined,
          notes: dto.notes === undefined ? undefined : dto.notes.trim() || null,
          active: dto.active,
          installedEquipmentId: ctx.installedEquipmentId,
          typeId: ctx.typeId,
          kind: ctx.kind,
        },
        include: contractInclude,
      }),
    );
  }

  async generate(user: AuthUser, id: string) {
    const contract = await this.prisma.maintenanceContract.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        type: { select: { defaultDuration: true, name: true } },
        equipment: { select: { serialNumber: true, part: { select: { name: true } } } },
        site: { select: { name: true } },
        workOrders: {
          where: { status: { in: OPEN_VISIT } },
          select: { id: true, number: true, status: true },
          take: 1,
        },
      },
    });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    if (!contract.active) throw new BadRequestException('Ce contrat est inactif');
    if (contract.workOrders[0]) {
      throw new BadRequestException(
        `Une visite est déjà ouverte (${contract.workOrders[0].number})`,
      );
    }

    const dueLabel = contract.nextDueAt.toLocaleDateString('fr-FR');
    const unit = contract.equipment
      ? `${contract.equipment.part.name} · n° ${contract.equipment.serialNumber}`
      : null;
    const description = [
      `Visite contractuelle prévue le ${dueLabel}.`,
      unit ? `Équipement : ${unit}.` : null,
      contract.notes,
    ]
      .filter(Boolean)
      .join(' ');

    const order = await this.workOrders.create(user, {
      title: contract.title,
      description,
      customerId: contract.customerId,
      siteId: contract.siteId,
      typeId: contract.typeId ?? undefined,
      kind: contract.kind,
      estimatedMinutes: contract.type?.defaultDuration ?? undefined,
      contractId: contract.id,
    });

    return { contract: await this.get(user, id), workOrder: order };
  }

  async generateDue(user: AuthUser) {
    const today = startOfToday();
    const due = await this.prisma.maintenanceContract.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
        nextDueAt: { lte: today },
        workOrders: { none: { status: { in: OPEN_VISIT } } },
      },
      select: { id: true },
    });
    const created = [];
    for (const row of due) {
      created.push(await this.generate(user, row.id));
    }
    return { count: created.length, visits: created };
  }

  static advanceAfterVisit(
    intervalMonths: number,
    completedAt = new Date(),
  ) {
    return {
      lastVisitAt: completedAt,
      nextDueAt: addMonths(completedAt, intervalMonths),
    };
  }

  private present(
    row: Prisma.MaintenanceContractGetPayload<{ include: typeof contractInclude }>,
  ) {
    const { workOrders, ...rest } = row;
    return {
      ...rest,
      openVisit: workOrders[0] ?? null,
      dueState: dueState(row.nextDueAt, row.active),
    };
  }

  private async resolveScope(
    user: AuthUser,
    dto: {
      customerId: string;
      siteId: string;
      installedEquipmentId?: string | null;
      typeId?: string | null;
      kind?: InterventionKind;
    },
  ) {
    const site = await this.prisma.site.findFirst({
      where: {
        id: dto.siteId,
        customerId: dto.customerId,
        organizationId: user.organizationId,
      },
    });
    if (!site) {
      throw new BadRequestException('Le site doit appartenir à ce client');
    }

    let installedEquipmentId: string | null = dto.installedEquipmentId || null;
    if (installedEquipmentId) {
      const unit = await this.prisma.installedEquipment.findFirst({
        where: {
          id: installedEquipmentId,
          organizationId: user.organizationId,
          siteId: site.id,
        },
      });
      if (!unit) {
        throw new BadRequestException('Cet équipement n’est pas sur ce site');
      }
    }

    let typeId: string | null = dto.typeId || null;
    let kind = dto.kind ?? InterventionKind.REPAIR;
    if (typeId) {
      const type = await this.prisma.workOrderType.findFirst({
        where: { id: typeId, organizationId: user.organizationId, active: true },
      });
      if (!type) throw new BadRequestException('Catégorie introuvable');
      if (type.kind) kind = type.kind;
    }

    return {
      customerId: site.customerId,
      siteId: site.id,
      installedEquipmentId,
      typeId,
      kind,
    };
  }
}
