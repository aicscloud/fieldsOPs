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
import { MembershipRole, WorkOrderStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../auth/auth.types';
import { AssignWorkOrderDto } from './dto/assign-work-order.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import {
  AddNoteDto,
  AddPhotoDto,
  FieldLocationDto,
  SignatureDto,
  UpsertChecklistItemDto,
} from './dto/field-action.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { WorkOrdersService } from './work-orders.service';

@Controller('work-orders')
@UseGuards(RolesGuard)
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get('stats')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  stats(@CurrentUser() user: AuthUser) {
    return this.workOrdersService.stats(user);
  }

  @Get('availability')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  availability(
    @CurrentUser() user: AuthUser,
    @Query('workerId') workerId: string,
    @Query('date') date: string,
    @Query('durationMinutes') durationMinutes?: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.workOrdersService.availability(user, {
      workerId,
      date,
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      excludeId,
    });
  }

  @Get()
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
    MembershipRole.FIELD_WORKER,
  )
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: WorkOrderStatus,
    @Query('assignedToId') assignedToId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('mine') mine?: string,
    @Query('q') q?: string,
    @Query('take') take?: string,
  ) {
    return this.workOrdersService.list(user, {
      status,
      assignedToId,
      from,
      to,
      mine: mine === 'true',
      q,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
    MembershipRole.FIELD_WORKER,
  )
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workOrdersService.get(user, id);
  }

  @Get(':id/report')
  @Roles(
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
    MembershipRole.FIELD_WORKER,
  )
  report(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workOrdersService.report(user, id);
  }

  @Post()
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkOrderDto) {
    return this.workOrdersService.create(user, dto);
  }

  @Patch(':id')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.workOrdersService.update(user, id, dto);
  }

  @Post(':id/assign')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignWorkOrderDto,
  ) {
    return this.workOrdersService.assign(user, id, dto);
  }

  @Post(':id/unassign')
  @Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
  unassign(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workOrdersService.unassign(user, id);
  }

  @Post(':id/en-route')
  @Roles(MembershipRole.FIELD_WORKER, MembershipRole.OWNER, MembershipRole.MANAGER)
  enRoute(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: FieldLocationDto,
  ) {
    return this.workOrdersService.enRoute(user, id, dto);
  }

  @Post(':id/start')
  @Roles(MembershipRole.FIELD_WORKER, MembershipRole.OWNER, MembershipRole.MANAGER)
  start(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: FieldLocationDto,
  ) {
    return this.workOrdersService.start(user, id, dto);
  }

  @Post(':id/pause')
  @Roles(MembershipRole.FIELD_WORKER, MembershipRole.OWNER, MembershipRole.MANAGER)
  pause(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: FieldLocationDto,
  ) {
    return this.workOrdersService.pause(user, id, dto);
  }

  @Post(':id/complete')
  @Roles(MembershipRole.FIELD_WORKER, MembershipRole.OWNER, MembershipRole.MANAGER)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: FieldLocationDto,
  ) {
    return this.workOrdersService.complete(user, id, dto);
  }

  @Post(':id/notes')
  @Roles(MembershipRole.FIELD_WORKER, MembershipRole.OWNER, MembershipRole.MANAGER)
  addNote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.workOrdersService.addNote(user, id, dto);
  }

  @Post(':id/photos')
  @Roles(MembershipRole.FIELD_WORKER, MembershipRole.OWNER, MembershipRole.MANAGER)
  addPhoto(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddPhotoDto,
  ) {
    return this.workOrdersService.addPhoto(user, id, dto);
  }

  @Post(':id/checklist')
  @Roles(MembershipRole.FIELD_WORKER, MembershipRole.OWNER, MembershipRole.MANAGER)
  addChecklist(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertChecklistItemDto,
  ) {
    return this.workOrdersService.addChecklistItem(user, id, dto);
  }

  @Patch(':id/checklist/:itemId')
  @Roles(MembershipRole.FIELD_WORKER, MembershipRole.OWNER, MembershipRole.MANAGER)
  toggleChecklist(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body('done') done: boolean,
  ) {
    return this.workOrdersService.toggleChecklistItem(user, id, itemId, done);
  }

  @Post(':id/signature')
  @Roles(MembershipRole.FIELD_WORKER, MembershipRole.OWNER, MembershipRole.MANAGER)
  sign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SignatureDto,
  ) {
    return this.workOrdersService.sign(user, id, dto);
  }
}
