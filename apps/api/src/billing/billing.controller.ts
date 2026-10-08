import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DocumentStatus, MembershipRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../auth/auth.types';
import { BillingService } from './billing.service';
import { CreateBillingDocumentDto } from './dto/create-document.dto';

@Controller('billing')
@UseGuards(RolesGuard)
@Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('kind') kind?: string) {
    return this.billingService.list(user, kind);
  }

  @Get('from-work-order/:workOrderId')
  fromWorkOrder(
    @CurrentUser() user: AuthUser,
    @Param('workOrderId') workOrderId: string,
  ) {
    return this.billingService.fromWorkOrder(user, workOrderId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBillingDocumentDto) {
    return this.billingService.create(user, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('status') status: DocumentStatus,
  ) {
    return this.billingService.updateStatus(user, id, status);
  }
}
