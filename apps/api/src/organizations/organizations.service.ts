import { Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  getMine(user: AuthUser) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
    });
  }

  update(user: AuthUser, dto: UpdateOrganizationDto) {
    return this.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        ...dto,
        country: dto.country?.toUpperCase(),
      },
    });
  }
}
