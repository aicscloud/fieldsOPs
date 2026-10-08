import { MembershipRole } from '@prisma/client';

export type AuthUser = {
  userId: string;
  organizationId: string;
  email: string;
  role: MembershipRole;
};

export type FieldOpsJwtPayload = {
  sub: string;
  organizationId: string;
  email: string;
  role: MembershipRole;
  type: 'access' | 'refresh';
};
