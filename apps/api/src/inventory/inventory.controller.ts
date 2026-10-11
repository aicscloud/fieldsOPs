import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../auth/auth.types';
import {
  AdjustStockDto,
  CreatePartDto,
  InstallEquipmentDto,
  RemoveEquipmentDto,
  RepairEquipmentDto,
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

  @Get('parts/:id/movements')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  movements(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.inventoryService.listMovements(user, id);
  }

  @Get('installed')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER, MembershipRole.FIELD_WORKER)
  listInstalled(
    @CurrentUser() user: AuthUser,
    @Query('customerId') customerId?: string,
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.inventoryService.listInstalled(user, { customerId, siteId, status, q });
  }

  @Post('install')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER, MembershipRole.FIELD_WORKER)
  install(@CurrentUser() user: AuthUser, @Body() dto: InstallEquipmentDto) {
    return this.inventoryService.install(user, dto);
  }

  @Get('installed/:id/repairs')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER, MembershipRole.FIELD_WORKER)
  listRepairs(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.inventoryService.listRepairs(user, id);
  }

  @Post('installed/:id/remove')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RemoveEquipmentDto,
  ) {
    return this.inventoryService.remove(user, id, dto);
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

  @Post('work-orders/:workOrderId/repair')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER, MembershipRole.FIELD_WORKER)
  repair(
    @CurrentUser() user: AuthUser,
    @Param('workOrderId') workOrderId: string,
    @Body() dto: RepairEquipmentDto,
  ) {
    return this.inventoryService.repair(user, workOrderId, dto);
  }

  @Post('work-orders/:workOrderId/install')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER, MembershipRole.FIELD_WORKER)
  installOnWorkOrder(
    @CurrentUser() user: AuthUser,
    @Param('workOrderId') workOrderId: string,
    @Body() dto: InstallEquipmentDto,
  ) {
    return this.inventoryService.install(user, dto, workOrderId);
  }
}
