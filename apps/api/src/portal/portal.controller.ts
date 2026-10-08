import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../auth/auth.types';
import { PortalService } from './portal.service';

@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('links')
  @UseGuards(RolesGuard)
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  list(@CurrentUser() user: AuthUser) {
    return this.portalService.list(user);
  }

  @Post('work-orders/:workOrderId/link')
  @UseGuards(RolesGuard)
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  createLink(
    @CurrentUser() user: AuthUser,
    @Param('workOrderId') workOrderId: string,
  ) {
    return this.portalService.createLink(user, workOrderId);
  }

  @Public()
  @Get('public/:token')
  getPublic(@Param('token') token: string) {
    return this.portalService.getByToken(token);
  }
}
