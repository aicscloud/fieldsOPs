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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(RolesGuard)
@Roles(MembershipRole.OWNER, MembershipRole.MANAGER)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('take') take?: string,
    @Query('role') role?: MembershipRole,
    @Query('groupId') groupId?: string,
  ) {
    return this.usersService.list(user, {
      q,
      take: take ? Number(take) : undefined,
      role,
      groupId,
    });
  }

  @Post()
  @Roles(MembershipRole.OWNER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(user, dto);
  }

  @Patch(':id')
  @Roles(MembershipRole.OWNER)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(user, id, dto);
  }

  @Post(':id/suspend')
  @Roles(MembershipRole.OWNER)
  suspend(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.suspend(user, id);
  }
}
