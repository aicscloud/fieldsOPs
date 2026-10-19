import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async organizations() {
    const organizations = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        country: true,
        city: true,
        createdAt: true,
        _count: { select: { memberships: true, customers: true, workOrders: true } },
      },
    });

    return {
      count: organizations.length,
      organizations: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        email: org.email,
        phone: org.phone,
        country: org.country,
        city: org.city,
        createdAt: org.createdAt,
        members: org._count.memberships,
        customers: org._count.customers,
        workOrders: org._count.workOrders,
      })),
    };
  }
}
