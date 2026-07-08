import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Request } from 'express';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UsersService } from './users.service';
import { Public } from 'src/common/auth/public.decorator';
import { Roles } from 'src/common/auth/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserRole.SUPER_ADMIN)
  @Post('register')
  async register(@Body() payload: CreateUserDto) {
    return this.usersService.createUser(payload);
  }
  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() payload: LoginUserDto) {
    return this.usersService.login(payload);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request) {
    const authorization = req.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token required');
    }

    const token = authorization.slice('Bearer '.length).trim();
    return this.usersService.logout(token);
  }
}
