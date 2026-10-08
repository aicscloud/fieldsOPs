import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipRole,
  NoteKind,
  Prisma,
  TeamGroup,
  WorkOrderStatus,
  UserStatus,
} from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { AssignWorkOrderDto } from './dto/assign-work-order.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import {
  AddNoteDto,
  AddPhotoDto,
  FieldLocationDto,
  SignatureDto,
  UpsertChecklistItemDto,
} from './dto/field-action.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

const ACTIVE_SCHEDULE_STATUSES: WorkOrderStatus[] = [
  WorkOrderStatus.SCHEDULED,
  WorkOrderStatus.ASSIGNED,
  WorkOrderStatus.EN_ROUTE,
  WorkOrderStatus.IN_PROGRESS,
  WorkOrderStatus.PAUSED,
];

const workOrderInclude = {
  customer: {
    select: {
      id: true,
      name: true,
      type: true,
      email: true,
      phone: true,
      address: true,
      notes: true,
    },
  },
  site: true,
  type: true,
  assignedTo: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },
  notes: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      author: { select: { firstName: true, lastName: true } },
      parts: {
        include: { part: { select: { id: true, name: true, sku: true, unit: true } } },
      },
      linkedWorkOrder: {
        select: { id: true, number: true, title: true, status: true },
      },
    },
  },
  photos: { orderBy: { createdAt: 'desc' as const } },
  checklist: { orderBy: { sortOrder: 'asc' as const } },
  signature: true,
  children: {
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      team: true,
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  timeEntries: { orderBy: { startedAt: 'desc' as const } },
  events: { orderBy: { createdAt: 'desc' as const }, take: 20 },
  partsUsed: {
    include: { part: true },
    orderBy: { createdAt: 'desc' as const },
  },
};

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthUser,
    filters?: {
      status?: WorkOrderStatus;
      assignedToId?: string;
      from?: string;
      to?: string;
      mine?: boolean;
      q?: string;
      take?: number;
    },
  ) {
    const where: Prisma.WorkOrderWhereInput = {
      organizationId: user.organizationId,
    };

    if (filters?.status) where.status = filters.status;
    if (filters?.assignedToId && user.role !== MembershipRole.FIELD_WORKER) {
      where.assignedToId = filters.assignedToId;
    }
    if (filters?.mine || user.role === MembershipRole.FIELD_WORKER) {
      const team = await this.memberTeam(user);
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        team === TeamGroup.TRANSPORT
          ? { OR: [{ assignedToId: user.userId }, { team: TeamGroup.TRANSPORT }] }
          : { assignedToId: user.userId },
      ];
    }
    if (filters?.from || filters?.to) {
      where.scheduledStart = {};
      if (filters.from) where.scheduledStart.gte = new Date(filters.from);
      if (filters.to) where.scheduledStart.lte = new Date(filters.to);
    }
    const q = filters?.q?.trim();
    if (q) {
      where.OR = [
        { number: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }
    const take =
      filters?.take != null
        ? Math.min(Math.max(filters.take, 1), 50)
        : undefined;

    return this.prisma.workOrder.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        site: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            latitude: true,
            longitude: true,
          },
        },
        type: true,
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        children: {
          where: { team: TeamGroup.TRANSPORT },
          select: {
            id: true,
            team: true,
            assignedTo: { select: { id: true, firstName: true, lastName: true } },
          },
          take: 1,
        },
      },
      orderBy: [{ scheduledStart: 'asc' }, { createdAt: 'desc' }],
      ...(take != null ? { take } : {}),
    });
  }

  async availability(
    user: AuthUser,
    opts: {
      workerId: string;
      date: string;
      durationMinutes?: number;
      excludeId?: string;
    },
  ) {
    const [y, m, d] = opts.date.split('-').map(Number);
    if (!y || !m || !d) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
      select: { workdayStart: true, workdayEnd: true },
    });
    const startH = Math.min(Math.max(org.workdayStart ?? 7, 0), 23);
    const endH = Math.min(Math.max(org.workdayEnd ?? 19, startH + 1), 24);
    const duration = Math.max(opts.durationMinutes ?? 60, 15);
    const dayStart = new Date(y, m - 1, d, startH, 0, 0, 0);
    const dayEnd = new Date(y, m - 1, d, endH, 0, 0, 0);

    const busyRows = await this.prisma.workOrder.findMany({
      where: {
        organizationId: user.organizationId,
        assignedToId: opts.workerId,
        status: { in: ACTIVE_SCHEDULE_STATUSES },
        id: opts.excludeId ? { not: opts.excludeId } : undefined,
        scheduledStart: { lt: dayEnd },
        scheduledEnd: { gt: dayStart },
      },
      select: {
        id: true,
        number: true,
        title: true,
        scheduledStart: true,
        scheduledEnd: true,
      },
      orderBy: { scheduledStart: 'asc' },
    });

    const busy = busyRows
      .filter((r) => r.scheduledStart && r.scheduledEnd)
      .map((r) => ({
        start: r.scheduledStart!.toISOString(),
        end: r.scheduledEnd!.toISOString(),
        number: r.number,
        title: r.title,
      }));

    const busyMs = busy
      .map((b) => ({
        start: Math.max(new Date(b.start).getTime(), dayStart.getTime()),
        end: Math.min(new Date(b.end).getTime(), dayEnd.getTime()),
      }))
      .filter((b) => b.end > b.start)
      .sort((a, b) => a.start - b.start);

    const merged: { start: number; end: number }[] = [];
    for (const b of busyMs) {
      const last = merged[merged.length - 1];
      if (!last || b.start > last.end) merged.push({ ...b });
      else last.end = Math.max(last.end, b.end);
    }

    const step = 30 * 60_000;
    const span = duration * 60_000;
    const slots: { start: string; end: string }[] = [];
    let cursor = dayStart.getTime();
    const now = Date.now();
    const isToday =
      dayStart.getFullYear() === new Date().getFullYear() &&
      dayStart.getMonth() === new Date().getMonth() &&
      dayStart.getDate() === new Date().getDate();

    if (isToday) {
      const rounded = Math.ceil(now / step) * step;
      cursor = Math.max(cursor, rounded);
    }

    while (cursor + span <= dayEnd.getTime() && slots.length < 16) {
      const slotEnd = cursor + span;
      const overlaps = merged.some((b) => cursor < b.end && slotEnd > b.start);
      if (!overlaps) {
        slots.push({
          start: new Date(cursor).toISOString(),
          end: new Date(slotEnd).toISOString(),
        });
      }
      cursor += step;
    }

    return {
      day: opts.date,
      durationMinutes: duration,
      busy,
      slots,
    };
  }

  async get(user: AuthUser, id: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, organizationId: user.organizationId },
      include: workOrderInclude,
    });
    if (!workOrder) throw new NotFoundException('Work order not found');

    if (
      user.role === MembershipRole.FIELD_WORKER &&
      !(await this.canAccess(user, workOrder))
    ) {
      throw new ForbiddenException('Not assigned to this work order');
    }

    return workOrder;
  }

  async create(user: AuthUser, dto: CreateWorkOrderDto) {
    await this.ensureCustomerAndSite(user, dto.customerId, dto.siteId);
    const type = dto.typeId ? await this.ensureType(user, dto.typeId) : null;

    if (type?.requiresTransport && (!dto.fieldWorkerId || !dto.transporterId)) {
      throw new BadRequestException(
        'Cette intervention nécessite un technicien et un transporteur',
      );
    }
    if (dto.fieldWorkerId && dto.fieldWorkerId === dto.transporterId) {
      throw new BadRequestException(
        'Le technicien et le transporteur doivent être deux personnes',
      );
    }

    if (dto.fieldWorkerId) {
      await this.assertFieldWorker(user, dto.fieldWorkerId, dto.fieldGroupId);
    }
    if (dto.transporterId) {
      await this.assertFieldWorker(user, dto.transporterId, dto.transportGroupId);
    }

    const scheduledStart = dto.scheduledStart
      ? new Date(dto.scheduledStart)
      : undefined;
    const scheduledEnd = dto.scheduledEnd
      ? new Date(dto.scheduledEnd)
      : undefined;
    if ((dto.fieldWorkerId || dto.transporterId) && (!scheduledStart || !scheduledEnd)) {
      throw new BadRequestException(
        'Un créneau est requis pour affecter un technicien',
      );
    }
    if (scheduledStart && scheduledEnd && scheduledEnd <= scheduledStart) {
      throw new BadRequestException('scheduledEnd must be after scheduledStart');
    }
    if (dto.fieldWorkerId && scheduledStart && scheduledEnd) {
      await this.assertNoConflict(
        user.organizationId,
        dto.fieldWorkerId,
        scheduledStart,
        scheduledEnd,
      );
    }
    if (dto.transporterId && scheduledStart && scheduledEnd) {
      await this.assertNoConflict(
        user.organizationId,
        dto.transporterId,
        scheduledStart,
        scheduledEnd,
      );
    }

    const number = await this.nextNumber(user.organizationId);
    const transportNumber = dto.transporterId
      ? await this.nextNumber(user.organizationId)
      : null;
    const status = dto.fieldWorkerId
      ? WorkOrderStatus.ASSIGNED
      : scheduledStart
        ? WorkOrderStatus.SCHEDULED
        : WorkOrderStatus.DRAFT;

    const created = await this.prisma.$transaction(async (tx) => {
      const parent = await tx.workOrder.create({
        data: {
          organizationId: user.organizationId,
          number,
          title: dto.title,
          description: dto.description,
          customerId: dto.customerId,
          siteId: dto.siteId,
          typeId: dto.typeId,
          priority: dto.priority,
          status,
          team: TeamGroup.FIELD,
          assignedToId: dto.fieldWorkerId,
          scheduledStart,
          scheduledEnd,
          estimatedMinutes: dto.estimatedMinutes,
          events: {
            create: {
              organizationId: user.organizationId,
              actorId: user.userId,
              toStatus: status,
              note: 'Work order created',
            },
          },
        },
      });

      if (dto.fieldWorkerId) {
        await tx.workOrderAssignment.create({
          data: {
            organizationId: user.organizationId,
            workOrderId: parent.id,
            fieldWorkerId: dto.fieldWorkerId,
            assignedById: user.userId,
          },
        });
      }

      if (dto.transporterId && transportNumber && scheduledStart && scheduledEnd) {
        const child = await tx.workOrder.create({
          data: {
            organizationId: user.organizationId,
            number: transportNumber,
            title: `Transport · ${number}`,
            description: `Livraison des équipements pour ${number}`,
            customerId: dto.customerId,
            siteId: dto.siteId,
            priority: dto.priority,
            status: WorkOrderStatus.ASSIGNED,
            team: TeamGroup.TRANSPORT,
            parentId: parent.id,
            assignedToId: dto.transporterId,
            scheduledStart,
            scheduledEnd,
            estimatedMinutes: dto.estimatedMinutes,
            events: {
              create: {
                organizationId: user.organizationId,
                actorId: user.userId,
                toStatus: WorkOrderStatus.ASSIGNED,
                note: `Transport lié à ${number}`,
              },
            },
          },
        });
        await tx.workOrderAssignment.create({
          data: {
            organizationId: user.organizationId,
            workOrderId: child.id,
            fieldWorkerId: dto.transporterId,
            assignedById: user.userId,
          },
        });
      }

      return parent;
    });

    return this.get(user, created.id);
  }

  async update(user: AuthUser, id: string, dto: UpdateWorkOrderDto) {
    const existing = await this.ensureOwned(user, id);

    if (
      (dto.scheduledStart || dto.scheduledEnd || dto.status) &&
      existing.assignedToId
    ) {
      const start = dto.scheduledStart
        ? new Date(dto.scheduledStart)
        : existing.scheduledStart;
      const end = dto.scheduledEnd
        ? new Date(dto.scheduledEnd)
        : existing.scheduledEnd;
      if (start && end) {
        await this.assertNoConflict(
          user.organizationId,
          existing.assignedToId,
          start,
          end,
          id,
        );
      }
    }

    return this.prisma.workOrder.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        typeId: dto.typeId,
        priority: dto.priority,
        status: dto.status,
        scheduledStart: dto.scheduledStart
          ? new Date(dto.scheduledStart)
          : undefined,
        scheduledEnd: dto.scheduledEnd ? new Date(dto.scheduledEnd) : undefined,
        estimatedMinutes: dto.estimatedMinutes,
      },
      include: workOrderInclude,
    });
  }

  async unassign(user: AuthUser, id: string) {
    const workOrder = await this.ensureOwned(user, id);
    return this.prisma.workOrder.update({
      where: { id: workOrder.id },
      data: {
        assignedToId: null,
        scheduledStart: null,
        scheduledEnd: null,
        status:
          workOrder.status === WorkOrderStatus.ASSIGNED ||
          workOrder.status === WorkOrderStatus.SCHEDULED
            ? WorkOrderStatus.DRAFT
            : workOrder.status,
        events: {
          create: {
            organizationId: user.organizationId,
            actorId: user.userId,
            fromStatus: workOrder.status,
            toStatus:
              workOrder.status === WorkOrderStatus.ASSIGNED ||
              workOrder.status === WorkOrderStatus.SCHEDULED
                ? WorkOrderStatus.DRAFT
                : workOrder.status,
            note: 'Assignment cleared from planning',
          },
        },
      },
      include: workOrderInclude,
    });
  }

  async assign(user: AuthUser, id: string, dto: AssignWorkOrderDto) {
    const workOrder = await this.ensureOwned(user, id);

    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: user.organizationId,
          userId: dto.fieldWorkerId,
        },
      },
      include: { user: true },
    });

    if (
      !membership ||
      membership.user.status !== UserStatus.ACTIVE ||
      membership.role !== MembershipRole.FIELD_WORKER
    ) {
      throw new BadRequestException(
        'Assignee must be an active field worker in this organization',
      );
    }

    const scheduledStart = dto.scheduledStart
      ? new Date(dto.scheduledStart)
      : workOrder.scheduledStart;
    const scheduledEnd = dto.scheduledEnd
      ? new Date(dto.scheduledEnd)
      : workOrder.scheduledEnd;

    if (!scheduledStart || !scheduledEnd) {
      throw new BadRequestException(
        'scheduledStart and scheduledEnd are required for assignment',
      );
    }
    if (scheduledEnd <= scheduledStart) {
      throw new BadRequestException('scheduledEnd must be after scheduledStart');
    }

    await this.assertNoConflict(
      user.organizationId,
      dto.fieldWorkerId,
      scheduledStart,
      scheduledEnd,
      id,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.workOrderAssignment.upsert({
        where: { workOrderId: id },
        create: {
          organizationId: user.organizationId,
          workOrderId: id,
          fieldWorkerId: dto.fieldWorkerId,
          assignedById: user.userId,
        },
        update: {
          fieldWorkerId: dto.fieldWorkerId,
          assignedById: user.userId,
          assignedAt: new Date(),
        },
      });

      return tx.workOrder.update({
        where: { id },
        data: {
          assignedToId: dto.fieldWorkerId,
          scheduledStart,
          scheduledEnd,
          status: WorkOrderStatus.ASSIGNED,
          events: {
            create: {
              organizationId: user.organizationId,
              actorId: user.userId,
              fromStatus: workOrder.status,
              toStatus: WorkOrderStatus.ASSIGNED,
              note: `Assigned to field worker ${dto.fieldWorkerId}`,
            },
          },
        },
        include: workOrderInclude,
      });
    });
  }

  async enRoute(user: AuthUser, id: string, dto: FieldLocationDto) {
    return this.transitionField(user, id, WorkOrderStatus.EN_ROUTE, dto, [
      WorkOrderStatus.SCHEDULED,
      WorkOrderStatus.ASSIGNED,
      WorkOrderStatus.PAUSED,
    ]);
  }

  async start(user: AuthUser, id: string, dto: FieldLocationDto) {
    const workOrder = await this.getAssigned(user, id);
    const canStart: WorkOrderStatus[] = [
      WorkOrderStatus.SCHEDULED,
      WorkOrderStatus.ASSIGNED,
      WorkOrderStatus.EN_ROUTE,
      WorkOrderStatus.PAUSED,
    ];
    if (!canStart.includes(workOrder.status)) {
      throw new BadRequestException(
        `Cannot start from status ${workOrder.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.workOrderTimeEntry.create({
        data: {
          organizationId: user.organizationId,
          workOrderId: id,
          startedAt: new Date(),
          latitudeStart: dto.latitude,
          longitudeStart: dto.longitude,
        },
      });

      return tx.workOrder.update({
        where: { id },
        data: {
          status: WorkOrderStatus.IN_PROGRESS,
          startedAt: workOrder.startedAt ?? new Date(),
          events: {
            create: {
              organizationId: user.organizationId,
              actorId: user.userId,
              fromStatus: workOrder.status,
              toStatus: WorkOrderStatus.IN_PROGRESS,
              note: dto.note,
              latitude: dto.latitude,
              longitude: dto.longitude,
            },
          },
        },
        include: workOrderInclude,
      });
    });
  }

  async pause(user: AuthUser, id: string, dto: FieldLocationDto) {
    const workOrder = await this.getAssigned(user, id);
    if (workOrder.status !== WorkOrderStatus.IN_PROGRESS) {
      throw new BadRequestException('Only in-progress work orders can be paused');
    }
    const reason = dto.note?.trim();
    if (!reason) {
      throw new BadRequestException('Une raison est requise pour la pause');
    }

    return this.prisma.$transaction(async (tx) => {
      const open = await tx.workOrderTimeEntry.findFirst({
        where: { workOrderId: id, endedAt: null },
        orderBy: { startedAt: 'desc' },
      });
      if (open) {
        await tx.workOrderTimeEntry.update({
          where: { id: open.id },
          data: {
            endedAt: new Date(),
            latitudeEnd: dto.latitude,
            longitudeEnd: dto.longitude,
          },
        });
      }

      return tx.workOrder.update({
        where: { id },
        data: {
          status: WorkOrderStatus.PAUSED,
          events: {
            create: {
              organizationId: user.organizationId,
              actorId: user.userId,
              fromStatus: workOrder.status,
              toStatus: WorkOrderStatus.PAUSED,
              note: reason,
              latitude: dto.latitude,
              longitude: dto.longitude,
            },
          },
        },
        include: workOrderInclude,
      });
    });
  }

  async complete(user: AuthUser, id: string, dto: FieldLocationDto) {
    const workOrder = await this.getAssigned(user, id);
    const canComplete: WorkOrderStatus[] = [
      WorkOrderStatus.IN_PROGRESS,
      WorkOrderStatus.PAUSED,
    ];
    if (!canComplete.includes(workOrder.status)) {
      throw new BadRequestException(
        'Work order must be in progress or paused to complete',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const open = await tx.workOrderTimeEntry.findFirst({
        where: { workOrderId: id, endedAt: null },
        orderBy: { startedAt: 'desc' },
      });
      if (open) {
        await tx.workOrderTimeEntry.update({
          where: { id: open.id },
          data: {
            endedAt: new Date(),
            latitudeEnd: dto.latitude,
            longitudeEnd: dto.longitude,
          },
        });
      }

      return tx.workOrder.update({
        where: { id },
        data: {
          status: WorkOrderStatus.COMPLETED,
          completedAt: new Date(),
          events: {
            create: {
              organizationId: user.organizationId,
              actorId: user.userId,
              fromStatus: workOrder.status,
              toStatus: WorkOrderStatus.COMPLETED,
              note: dto.note,
              latitude: dto.latitude,
              longitude: dto.longitude,
            },
          },
        },
        include: workOrderInclude,
      });
    });
  }

  async addNote(user: AuthUser, id: string, dto: AddNoteDto) {
    const parent = await this.getAssigned(user, id);
    const kind = dto.kind === NoteKind.EQUIPMENT_REQUEST
      ? NoteKind.EQUIPMENT_REQUEST
      : NoteKind.NOTE;
    const parts = (dto.parts ?? []).filter((p) => p.partId && p.quantity > 0);

    if (kind === NoteKind.EQUIPMENT_REQUEST && !parts.length) {
      throw new BadRequestException('Ajoutez au moins un équipement');
    }

    const note = await this.prisma.workOrderNote.create({
      data: {
        organizationId: user.organizationId,
        workOrderId: id,
        authorId: user.userId,
        kind,
        body: dto.body.trim(),
        parts: parts.length
          ? {
              create: parts.map((p) => ({
                partId: p.partId,
                quantity: p.quantity,
              })),
            }
          : undefined,
      },
    });

    if (kind === NoteKind.EQUIPMENT_REQUEST) {
      const number = await this.nextNumber(user.organizationId);
      const catalog = await this.prisma.part.findMany({
        where: {
          organizationId: user.organizationId,
          id: { in: parts.map((p) => p.partId) },
        },
        select: { id: true, name: true, sku: true, unit: true },
      });
      const lines = parts
        .map((p) => {
          const part = catalog.find((c) => c.id === p.partId);
          return part ? `${p.quantity} ${part.unit} · ${part.name} (${part.sku})` : null;
        })
        .filter(Boolean)
        .join('\n');

      const child = await this.prisma.workOrder.create({
        data: {
          organizationId: user.organizationId,
          number,
          title: `Livraison équipements · ${parent.number}`,
          description: `${dto.body.trim()}${lines ? `\n\n${lines}` : ''}`,
          customerId: parent.customerId,
          siteId: parent.siteId,
          priority: parent.priority,
          status: WorkOrderStatus.SCHEDULED,
          team: TeamGroup.TRANSPORT,
          parentId: parent.id,
          events: {
            create: {
              organizationId: user.organizationId,
              actorId: user.userId,
              toStatus: WorkOrderStatus.SCHEDULED,
              note: `Demande d'équipements depuis ${parent.number}`,
            },
          },
        },
      });

      await this.prisma.workOrderNote.update({
        where: { id: note.id },
        data: { linkedWorkOrderId: child.id },
      });
    }

    return this.get(user, id);
  }

  async addPhoto(user: AuthUser, id: string, dto: AddPhotoDto) {
    await this.getAssigned(user, id);
    await this.prisma.workOrderPhoto.create({
      data: {
        organizationId: user.organizationId,
        workOrderId: id,
        url: dto.url,
        caption: dto.caption,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
    return this.get(user, id);
  }

  async addChecklistItem(
    user: AuthUser,
    id: string,
    dto: UpsertChecklistItemDto,
  ) {
    await this.ensureOwnedOrAssigned(user, id);
    const count = await this.prisma.workOrderChecklistItem.count({
      where: { workOrderId: id },
    });
    await this.prisma.workOrderChecklistItem.create({
      data: {
        organizationId: user.organizationId,
        workOrderId: id,
        label: dto.label,
        done: dto.done ?? false,
        sortOrder: count,
      },
    });
    return this.get(user, id);
  }

  async toggleChecklistItem(
    user: AuthUser,
    workOrderId: string,
    itemId: string,
    done: boolean,
  ) {
    await this.getAssigned(user, workOrderId);
    const item = await this.prisma.workOrderChecklistItem.findFirst({
      where: {
        id: itemId,
        workOrderId,
        organizationId: user.organizationId,
      },
    });
    if (!item) throw new NotFoundException('Checklist item not found');

    await this.prisma.workOrderChecklistItem.update({
      where: { id: itemId },
      data: { done },
    });
    return this.get(user, workOrderId);
  }

  async sign(user: AuthUser, id: string, dto: SignatureDto) {
    await this.getAssigned(user, id);
    await this.prisma.workOrderSignature.upsert({
      where: { workOrderId: id },
      create: {
        organizationId: user.organizationId,
        workOrderId: id,
        signerName: dto.signerName,
        imageUrl: dto.imageUrl,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      update: {
        signerName: dto.signerName,
        imageUrl: dto.imageUrl,
        signedAt: new Date(),
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
    return this.get(user, id);
  }

  async report(user: AuthUser, id: string) {
    const workOrder = await this.get(user, id);
    const durationMinutes = workOrder.timeEntries.reduce((acc, entry) => {
      if (!entry.endedAt) return acc;
      return (
        acc +
        Math.round(
          (entry.endedAt.getTime() - entry.startedAt.getTime()) / 60000,
        )
      );
    }, 0);

    return {
      number: workOrder.number,
      title: workOrder.title,
      status: workOrder.status,
      customer: workOrder.customer,
      site: workOrder.site,
      type: workOrder.type,
      technician: workOrder.assignedTo,
      scheduledStart: workOrder.scheduledStart,
      scheduledEnd: workOrder.scheduledEnd,
      startedAt: workOrder.startedAt,
      completedAt: workOrder.completedAt,
      durationMinutes,
      notes: workOrder.notes,
      photos: workOrder.photos,
      checklist: workOrder.checklist,
      signature: workOrder.signature,
      generatedAt: new Date().toISOString(),
    };
  }

  async stats(user: AuthUser) {
    const orgId = user.organizationId;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(24, 0, 0, 0);

    const [
      total,
      completed,
      inProgress,
      overdue,
      today,
      cancelled,
      unassigned,
      byStatusRaw,
    ] = await Promise.all([
      this.prisma.workOrder.count({ where: { organizationId: orgId } }),
      this.prisma.workOrder.count({
        where: { organizationId: orgId, status: WorkOrderStatus.COMPLETED },
      }),
      this.prisma.workOrder.count({
        where: {
          organizationId: orgId,
          status: {
            in: [
              WorkOrderStatus.ASSIGNED,
              WorkOrderStatus.EN_ROUTE,
              WorkOrderStatus.IN_PROGRESS,
              WorkOrderStatus.PAUSED,
            ],
          },
        },
      }),
      this.prisma.workOrder.count({
        where: {
          organizationId: orgId,
          status: { notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED] },
          scheduledEnd: { lt: new Date() },
        },
      }),
      this.prisma.workOrder.count({
        where: {
          organizationId: orgId,
          scheduledStart: { gte: dayStart, lt: dayEnd },
        },
      }),
      this.prisma.workOrder.count({
        where: { organizationId: orgId, status: WorkOrderStatus.CANCELLED },
      }),
      this.prisma.workOrder.count({
        where: {
          organizationId: orgId,
          assignedToId: null,
          status: {
            notIn: [
              WorkOrderStatus.COMPLETED,
              WorkOrderStatus.CANCELLED,
              WorkOrderStatus.FAILED,
            ],
          },
        },
      }),
      this.prisma.workOrder.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: { _all: true },
      }),
    ]);

    const byStatus = byStatusRaw
      .map((row) => ({ status: row.status, count: row._count._all }))
      .sort((a, b) => b.count - a.count);

    const completionRate =
      total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

    const days = 14;
    const rangeStart = new Date(dayStart);
    rangeStart.setDate(rangeStart.getDate() - (days - 1));

    const [createdInRange, completedInRange, assignedRows, recent] =
      await Promise.all([
        this.prisma.workOrder.findMany({
          where: {
            organizationId: orgId,
            createdAt: { gte: rangeStart },
          },
          select: { createdAt: true },
        }),
        this.prisma.workOrder.findMany({
          where: {
            organizationId: orgId,
            status: WorkOrderStatus.COMPLETED,
            completedAt: { gte: rangeStart },
          },
          select: { completedAt: true },
        }),
        this.prisma.workOrder.groupBy({
          by: ['assignedToId'],
          where: {
            organizationId: orgId,
            assignedToId: { not: null },
          },
          _count: { _all: true },
        }),
        this.prisma.workOrder.findMany({
          where: { organizationId: orgId },
          include: {
            customer: { select: { name: true } },
            assignedTo: {
              select: { firstName: true, lastName: true },
            },
            site: { select: { name: true, city: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 12,
        }),
      ]);

    const dayKeys: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(rangeStart);
      d.setDate(rangeStart.getDate() + i);
      dayKeys.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      );
    }

    const localKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const createdMap = new Map<string, number>();
    const completedMap = new Map<string, number>();
    for (const key of dayKeys) {
      createdMap.set(key, 0);
      completedMap.set(key, 0);
    }
    for (const row of createdInRange) {
      const key = localKey(row.createdAt);
      if (createdMap.has(key)) createdMap.set(key, (createdMap.get(key) ?? 0) + 1);
    }
    for (const row of completedInRange) {
      if (!row.completedAt) continue;
      const key = localKey(row.completedAt);
      if (completedMap.has(key)) {
        completedMap.set(key, (completedMap.get(key) ?? 0) + 1);
      }
    }

    const timeline = dayKeys.map((date) => ({
      date,
      created: createdMap.get(date) ?? 0,
      completed: completedMap.get(date) ?? 0,
    }));

    const topAssigned = [...assignedRows]
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 8);
    const workerIds = topAssigned
      .map((r) => r.assignedToId)
      .filter((id): id is string => !!id);
    const workers = workerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: workerIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const workerMap = new Map(workers.map((w) => [w.id, w]));
    const byWorker = topAssigned.map((row) => {
      const w = row.assignedToId ? workerMap.get(row.assignedToId) : null;
      return {
        workerId: row.assignedToId,
        name: w ? `${w.firstName} ${w.lastName}` : 'Inconnu',
        count: row._count._all,
      };
    });

    return {
      total,
      completed,
      inProgress,
      overdue,
      today,
      cancelled,
      unassigned,
      completionRate,
      byStatus,
      timeline,
      byWorker,
      recent: recent.map((o) => ({
        id: o.id,
        number: o.number,
        title: o.title,
        status: o.status,
        priority: o.priority,
        scheduledStart: o.scheduledStart,
        customer: o.customer?.name ?? null,
        technician: o.assignedTo
          ? `${o.assignedTo.firstName} ${o.assignedTo.lastName}`
          : null,
        site: o.site
          ? `${o.site.name}${o.site.city ? `, ${o.site.city}` : ''}`
          : null,
      })),
    };
  }

  private async transitionField(
    user: AuthUser,
    id: string,
    toStatus: WorkOrderStatus,
    dto: FieldLocationDto,
    allowedFrom: WorkOrderStatus[],
  ) {
    const workOrder = await this.getAssigned(user, id);
    if (!allowedFrom.includes(workOrder.status)) {
      throw new BadRequestException(
        `Cannot move to ${toStatus} from ${workOrder.status}`,
      );
    }

    return this.prisma.workOrder.update({
      where: { id },
      data: {
        status: toStatus,
        events: {
          create: {
            organizationId: user.organizationId,
            actorId: user.userId,
            fromStatus: workOrder.status,
            toStatus,
            note: dto.note,
            latitude: dto.latitude,
            longitude: dto.longitude,
          },
        },
      },
      include: workOrderInclude,
    });
  }

  private async assertNoConflict(
    organizationId: string,
    fieldWorkerId: string,
    start: Date,
    end: Date,
    excludeWorkOrderId?: string,
  ) {
    const conflict = await this.prisma.workOrder.findFirst({
      where: {
        organizationId,
        assignedToId: fieldWorkerId,
        status: { in: ACTIVE_SCHEDULE_STATUSES },
        id: excludeWorkOrderId ? { not: excludeWorkOrderId } : undefined,
        scheduledStart: { lt: end },
        scheduledEnd: { gt: start },
      },
      select: { id: true, number: true, title: true, scheduledStart: true, scheduledEnd: true },
    });

    if (conflict) {
      throw new ConflictException({
        message:
          'Ce technicien possède déjà une intervention sur cette période.',
        conflict,
      });
    }
  }

  private async nextNumber(organizationId: string) {
    const counter = await this.prisma.workOrderCounter.upsert({
      where: { organizationId },
      create: { organizationId, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    const year = new Date().getFullYear();
    return `WO-${year}-${String(counter.lastNumber).padStart(5, '0')}`;
  }

  private async ensureCustomerAndSite(
    user: AuthUser,
    customerId: string,
    siteId: string,
  ) {
    const site = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        customerId,
        organizationId: user.organizationId,
      },
    });
    if (!site) {
      throw new BadRequestException(
        'Site must belong to the customer in this organization',
      );
    }
  }

  private async ensureType(user: AuthUser, typeId: string) {
    const type = await this.prisma.workOrderType.findFirst({
      where: { id: typeId, organizationId: user.organizationId, active: true },
    });
    if (!type) throw new NotFoundException('Work order type not found');
    return type;
  }

  private async assertFieldWorker(
    user: AuthUser,
    workerId: string,
    groupId?: string,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: user.organizationId,
          userId: workerId,
        },
      },
      include: { user: { select: { status: true } } },
    });
    if (
      !membership ||
      membership.user.status !== UserStatus.ACTIVE ||
      membership.role !== MembershipRole.FIELD_WORKER
    ) {
      throw new BadRequestException(
        'Choisissez un technicien actif de l’organisation',
      );
    }
    if (groupId && membership.groupId !== groupId) {
      throw new BadRequestException(
        'Cette personne n’appartient pas au groupe choisi',
      );
    }
  }

  private async ensureOwned(user: AuthUser, id: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!workOrder) throw new NotFoundException('Work order not found');
    return workOrder;
  }

  private async memberTeam(user: AuthUser) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: user.organizationId,
          userId: user.userId,
        },
      },
      select: { team: true },
    });
    return membership?.team ?? TeamGroup.FIELD;
  }

  private async canAccess(
    user: AuthUser,
    workOrder: { assignedToId: string | null; team: TeamGroup },
  ) {
    if (workOrder.assignedToId === user.userId) return true;
    if (user.role !== MembershipRole.FIELD_WORKER) return true;
    const team = await this.memberTeam(user);
    return team === TeamGroup.TRANSPORT && workOrder.team === TeamGroup.TRANSPORT;
  }

  private async getAssigned(user: AuthUser, id: string) {
    const workOrder = await this.ensureOwned(user, id);
    if (user.role === MembershipRole.FIELD_WORKER && !(await this.canAccess(user, workOrder))) {
      throw new ForbiddenException('Not assigned to this work order');
    }
    if (
      user.role !== MembershipRole.FIELD_WORKER &&
      user.role !== MembershipRole.OWNER &&
      user.role !== MembershipRole.MANAGER
    ) {
      throw new ForbiddenException();
    }
    return workOrder;
  }

  private async ensureOwnedOrAssigned(user: AuthUser, id: string) {
    if (user.role === MembershipRole.FIELD_WORKER) {
      return this.getAssigned(user, id);
    }
    return this.ensureOwned(user, id);
  }
}
