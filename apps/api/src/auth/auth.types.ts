import { MembershipRole } from '@prisma/client';

export const PLATFORM_ADMIN_ROLE = 'PLATFORM_ADMIN';

export type AppRole = MembershipRole | typeof PLATFORM_ADMIN_ROLE;

export type AuthUser = {
  userId: string;
  organizationId: string;
  email: string;
  role: AppRole;
};

export type FieldOpsJwtPayload = {
  sub: string;
  organizationId: string;
  email: string;
  role: AppRole;
  type: 'access' | 'refresh';
};
