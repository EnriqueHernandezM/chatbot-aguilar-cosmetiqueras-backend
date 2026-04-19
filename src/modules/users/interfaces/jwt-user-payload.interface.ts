import { UserRole } from 'src/common/enums/user-role.enum';

export interface JwtUserPayload {
  sub: string;
  role: UserRole;
  tokenVersion: number;
}
