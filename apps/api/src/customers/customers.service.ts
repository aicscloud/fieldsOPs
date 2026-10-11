import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, opts?: { q?: string; take?: number }) {
    const take =
      opts?.take != null
        ? Math.min(Math.max(opts.take, 1), 50)
        : undefined;
    const q = opts?.q?.trim();
    const customers = await this.prisma.customer.findMany({
      where: {
        organizationId: user.organizationId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      ...(take != null ? { take } : {}),
    });
    if (!customers.length) return [];
    const ids = customers.map((customer) => customer.id);
    const where = { organizationId: user.organizationId, customerId: { in: ids } };
    const [sites, jobs, gear] = await Promise.all([
      this.prisma.site.groupBy({
        by: ['customerId'],
        where,
        _count: { _all: true },
      }),
      this.prisma.workOrder.groupBy({
        by: ['customerId'],
        where,
        _count: { _all: true },
      }),
      this.prisma.installedEquipment.groupBy({
        by: ['customerId'],
        where: { ...where, status: 'INSTALLED' },
        _count: { _all: true },
      }),
    ]);
    const sitesByCustomer = new Map(sites.map((row) => [row.customerId, row._count._all]));
    const jobsByCustomer = new Map(jobs.map((row) => [row.customerId, row._count._all]));
    const gearByCustomer = new Map(gear.map((row) => [row.customerId, row._count._all]));
    return customers.map((customer) => ({
      ...customer,
      _count: {
        sites: sitesByCustomer.get(customer.id) ?? 0,
        workOrders: jobsByCustomer.get(customer.id) ?? 0,
        installedEquipment: gearByCustomer.get(customer.id) ?? 0,
      },
    }));
  }

  async get(user: AuthUser, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { sites: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  create(user: AuthUser, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        organizationId: user.organizationId,
        ...dto,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateCustomerDto) {
    await this.ensureOwned(user, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  private async ensureOwned(user: AuthUser, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
}
