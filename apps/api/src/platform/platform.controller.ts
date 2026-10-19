import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser, PLATFORM_ADMIN_ROLE } from '../auth/auth.types';
import { PlatformService } from './platform.service';

@Controller('platform')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('organizations')
  organizations(@CurrentUser() user: AuthUser) {
    if (user.role !== PLATFORM_ADMIN_ROLE) {
      throw new ForbiddenException('Insufficient role for this action');
    }
    return this.platform.organizations();
  }
}
