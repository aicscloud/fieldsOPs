import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  async createLink(user: AuthUser, workOrderId: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId: user.organizationId },
    });
    if (!wo) throw new NotFoundException('Work order not found');

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return this.prisma.portalLink.create({
      data: {
        organizationId: user.organizationId,
        workOrderId,
        token,
        expiresAt,
      },
    });
  }

  async getByToken(token: string) {
    const link = await this.prisma.portalLink.findUnique({
      where: { token },
      include: {
        workOrder: {
          include: {
            customer: { select: { name: true } },
            site: { select: { name: true, address: true, city: true } },
            type: { select: { name: true } },
            notes: { orderBy: { createdAt: 'desc' }, take: 10 },
            photos: { orderBy: { createdAt: 'desc' }, take: 10 },
            signature: true,
            checklist: { orderBy: { sortOrder: 'asc' } },
          },
        },
        organization: { select: { name: true, phone: true, email: true } },
      },
    });

    if (!link) throw new NotFoundException('Lien invalide');
    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new NotFoundException('Lien expiré');
    }

    return {
      organization: link.organization,
      workOrder: link.workOrder,
      expiresAt: link.expiresAt,
    };
  }

  list(user: AuthUser) {
    return this.prisma.portalLink.findMany({
      where: { organizationId: user.organizationId },
      include: {
        workOrder: { select: { id: true, number: true, title: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
