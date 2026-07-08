import { UserRole } from 'src/common/enums/user-role.enum';

export interface JwtUserPayload {
  sub: string;
  userId: string;
  role: UserRole;
  tenantId: string;
  tokenVersion: number;
}
