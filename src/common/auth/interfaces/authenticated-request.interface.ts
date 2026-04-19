import { Request } from 'express';
import { JwtUserPayload } from 'src/modules/users/interfaces/jwt-user-payload.interface';

export interface AuthenticatedRequest extends Request {
  user: JwtUserPayload;
  accessToken: string;
}
