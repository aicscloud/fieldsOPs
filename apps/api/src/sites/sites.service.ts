import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  list(
    user: AuthUser,
    opts?: { customerId?: string; q?: string; take?: number },
  ) {
    const take =
      opts?.take != null
        ? Math.min(Math.max(opts.take, 1), 50)
        : undefined;
    const q = opts?.q?.trim();
    return this.prisma.site.findMany({
      where: {
        organizationId: user.organizationId,
        ...(opts?.customerId ? { customerId: opts.customerId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { address: { contains: q, mode: 'insensitive' } },
                { city: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
      ...(take != null ? { take } : {}),
    });
  }

  async get(user: AuthUser, id: string) {
    const site = await this.prisma.site.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { customer: true },
    });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  async create(user: AuthUser, dto: CreateSiteDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId: user.organizationId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.site.create({
      data: {
        organizationId: user.organizationId,
        ...dto,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateSiteDto) {
    await this.ensureOwned(user, id);
    return this.prisma.site.update({ where: { id }, data: dto });
  }

  private async ensureOwned(user: AuthUser, id: string) {
    const site = await this.prisma.site.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }
}
