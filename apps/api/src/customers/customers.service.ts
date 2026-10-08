import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthUser, opts?: { q?: string; take?: number }) {
    const take =
      opts?.take != null
        ? Math.min(Math.max(opts.take, 1), 50)
        : undefined;
    const q = opts?.q?.trim();
    return this.prisma.customer.findMany({
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
      include: { _count: { select: { sites: true, workOrders: true } } },
      orderBy: { name: 'asc' },
      ...(take != null ? { take } : {}),
    });
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
