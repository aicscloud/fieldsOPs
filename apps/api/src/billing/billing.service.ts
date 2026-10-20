import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillingDocumentDto } from './dto/create-document.dto';

function salePrice(part: { salePrice?: number | null; unitCost?: number | null }) {
  return part.salePrice ?? part.unitCost ?? 0;
}

function lineLabel(usage: {
  part: { name: string; sku: string };
  installed?: { serialNumber: string } | null;
}) {
  const base = `${usage.part.name} (${usage.part.sku})`;
  return usage.installed ? `${base} · n° ${usage.installed.serialNumber}` : base;
}

function hoursFromMs(ms: number) {
  return Math.round((ms / 3_600_000) * 100) / 100;
}

function laborFromWorkOrder(wo: {
  estimatedMinutes?: number | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  timeEntries?: { startedAt: Date; endedAt: Date | null }[];
}) {
  const logged = (wo.timeEntries ?? []).reduce((acc, entry) => {
    if (!entry.endedAt) return acc;
    return acc + Math.max(0, entry.endedAt.getTime() - entry.startedAt.getTime());
  }, 0);
  if (logged > 0) {
    return { quantity: Math.max(0.25, hoursFromMs(logged)), source: 'actual' as const };
  }
  if (wo.startedAt && wo.completedAt) {
    const span = wo.completedAt.getTime() - wo.startedAt.getTime();
    if (span > 0) {
      return { quantity: Math.max(0.25, hoursFromMs(span)), source: 'actual' as const };
    }
  }
  if (wo.estimatedMinutes && wo.estimatedMinutes > 0) {
    return {
      quantity: Math.round((wo.estimatedMinutes / 60) * 100) / 100,
      source: 'estimated' as const,
    };
  }
  return { quantity: 1, source: 'default' as const };
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthUser, kind?: string) {
    return this.prisma.billingDocument.findMany({
      where: {
        organizationId: user.organizationId,
        ...(kind ? { kind: kind as never } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        workOrder: { select: { id: true, number: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async fromWorkOrder(user: AuthUser, workOrderId: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId: user.organizationId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        partsUsed: {
          include: { part: true, installed: true },
          orderBy: { createdAt: 'asc' },
        },
        timeEntries: { select: { startedAt: true, endedAt: true } },
      },
    });
    if (!wo) throw new NotFoundException('Work order not found');

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
      select: { laborHourlyRate: true, defaultTaxRate: true, currency: true },
    });

    const hours = laborFromWorkOrder(wo);
    const labor = {
      label: 'Main d’œuvre',
      quantity: hours.quantity,
      unitPrice: org.laborHourlyRate ?? 0,
      source: hours.source,
    };

    const parts = wo.partsUsed.map((u) => ({
      label: lineLabel(u),
      quantity: u.quantity,
      unitPrice: salePrice(u.part),
      sku: u.part.sku,
      unit: u.part.unit,
    }));

    return {
      workOrderId: wo.id,
      number: wo.number,
      title: `Facturation ${wo.number} — ${wo.title}`,
      customerId: wo.customerId,
      customerName: wo.customer.name,
      customerPhone: wo.customer.phone,
      currency: org.currency,
      taxRate: org.defaultTaxRate ?? 20,
      labor,
      parts,
      lines: [labor, ...parts],
    };
  }

  async create(user: AuthUser, dto: CreateBillingDocumentDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId: user.organizationId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    let partLines: { label: string; quantity: number; unitPrice: number }[] = [];
    if (dto.workOrderId) {
      const wo = await this.prisma.workOrder.findFirst({
        where: { id: dto.workOrderId, organizationId: user.organizationId },
        include: {
          partsUsed: { include: { part: true, installed: true }, orderBy: { createdAt: 'asc' } },
        },
      });
      if (!wo) throw new NotFoundException('Work order not found');

      if (!dto.skipPartsFromWorkOrder) {
        partLines = wo.partsUsed.map((u) => ({
          label: lineLabel(u),
          quantity: u.quantity,
          unitPrice: salePrice(u.part),
        }));
      }
    }

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
    });

    const lines = [...dto.lines, ...partLines];
    const subtotal = lines.reduce(
      (acc, line) => acc + line.quantity * line.unitPrice,
      0,
    );
    const taxRate = dto.taxRate ?? 0;
    const total = subtotal * (1 + taxRate / 100);
    const prefix = dto.kind === 'QUOTE' ? 'DEV' : 'FAC';
    const count = await this.prisma.billingDocument.count({
      where: { organizationId: user.organizationId, kind: dto.kind },
    });
    const number = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.billingDocument.create({
      data: {
        organizationId: user.organizationId,
        customerId: dto.customerId,
        workOrderId: dto.workOrderId,
        kind: dto.kind,
        number,
        title: dto.title,
        notes: dto.notes,
        currency: org.currency,
        subtotal,
        taxRate,
        total,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        lines: {
          create: lines.map((line, index) => ({
            label: line.label,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            sortOrder: index,
          })),
        },
      },
      include: {
        customer: true,
        workOrder: true,
        lines: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async updateStatus(user: AuthUser, id: string, status: DocumentStatus) {
    const doc = await this.prisma.billingDocument.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    return this.prisma.billingDocument.update({
      where: { id },
      data: {
        status,
        issuedAt:
          status === DocumentStatus.SENT || status === DocumentStatus.PAID
            ? doc.issuedAt ?? new Date()
            : doc.issuedAt,
      },
      include: { customer: true, lines: true, workOrder: true },
    });
  }
}
