import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../auth/auth.types';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { SitesService } from './sites.service';

@Controller('sites')
@UseGuards(RolesGuard)
@Roles(MembershipRole.OWNER, MembershipRole.MANAGER, MembershipRole.FIELD_WORKER)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('customerId') customerId?: string,
    @Query('q') q?: string,
    @Query('take') take?: string,
  ) {
    return this.sitesService.list(user, {
      customerId,
      q,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sitesService.get(user, id);
  }

  @Post()
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSiteDto) {
    return this.sitesService.create(user, dto);
  }

  @Patch(':id')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
  ) {
    return this.sitesService.update(user, id, dto);
  }
}
