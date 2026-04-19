import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { IS_PUBLIC_KEY } from '../public.decorator';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { JwtUserPayload } from 'src/modules/users/interfaces/jwt-user-payload.interface';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization || '';

    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token required');
    }

    const accessToken = authorization.slice('Bearer '.length).trim();
    if (!accessToken) {
      throw new UnauthorizedException('Bearer token required');
    }

    let payload: JwtUserPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtUserPayload>(accessToken);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.usersService.findActiveUserAuthById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    if ((user.tokenVersion || 0) !== payload.tokenVersion) {
      throw new UnauthorizedException('Token revoked');
    }

    request.user = {
      sub: String(user._id),
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    };
    request.accessToken = accessToken;

    return true;
  }
}
