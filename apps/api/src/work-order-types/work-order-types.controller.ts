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
import { CreateWorkOrderTypeDto } from './dto/create-work-order-type.dto';
import { UpdateWorkOrderTypeDto } from './dto/update-work-order-type.dto';
import { WorkOrderTypesService } from './work-order-types.service';

@Controller('work-order-types')
@UseGuards(RolesGuard)
@Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
export class WorkOrderTypesController {
  constructor(private readonly workOrderTypesService: WorkOrderTypesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('take') take?: string,
  ) {
    return this.workOrderTypesService.list(user, {
      q,
      take: take ? Number(take) : undefined,
    });
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkOrderTypeDto) {
    return this.workOrderTypesService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderTypeDto,
  ) {
    return this.workOrderTypesService.update(user, id, dto);
  }
}
