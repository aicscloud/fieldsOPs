import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../auth/auth.types';
import { ContractsService } from './contracts.service';
import { CreateContractDto, UpdateContractDto } from './dto/create-contract.dto';

@Controller('contracts')
@UseGuards(RolesGuard)
@Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.contractsService.summary(user);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('customerId') customerId?: string,
    @Query('siteId') siteId?: string,
    @Query('active') active?: string,
  ) {
    return this.contractsService.list(user, { customerId, siteId, active });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contractsService.get(user, id);
  }

  @Post('generate-due')
  generateDue(@CurrentUser() user: AuthUser) {
    return this.contractsService.generateDue(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateContractDto) {
    return this.contractsService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contractsService.update(user, id, dto);
  }

  @Post(':id/generate')
  generate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contractsService.generate(user, id);
  }
}
