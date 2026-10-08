import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../auth/auth.types';
import {
  AdjustStockDto,
  CreatePartDto,
  UpdatePartDto,
  UsePartOnWorkOrderDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('parts')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER, MembershipRole.FIELD_WORKER)
  listParts(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('take') take?: string,
  ) {
    return this.inventoryService.listParts(user, {
      q,
      take: take ? Number(take) : undefined,
    });
  }

  @Post('parts')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  createPart(@CurrentUser() user: AuthUser, @Body() dto: CreatePartDto) {
    return this.inventoryService.createPart(user, dto);
  }

  @Patch('parts/:id')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  updatePart(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePartDto,
  ) {
    return this.inventoryService.updatePart(user, id, dto);
  }

  @Post('parts/:id/adjust')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  adjust(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjust(user, id, dto);
  }

  @Get('work-orders/:workOrderId/parts')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER, MembershipRole.FIELD_WORKER)
  listUsage(
    @CurrentUser() user: AuthUser,
    @Param('workOrderId') workOrderId: string,
  ) {
    return this.inventoryService.listUsage(user, workOrderId);
  }

  @Post('work-orders/:workOrderId/parts')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER, MembershipRole.FIELD_WORKER)
  useOnWorkOrder(
    @CurrentUser() user: AuthUser,
    @Param('workOrderId') workOrderId: string,
    @Body() dto: UsePartOnWorkOrderDto,
  ) {
    return this.inventoryService.useOnWorkOrder(user, workOrderId, dto);
  }
}
