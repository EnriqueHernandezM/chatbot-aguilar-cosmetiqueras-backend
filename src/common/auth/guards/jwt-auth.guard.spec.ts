import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { UserRole } from 'src/common/enums/user-role.enum';
import { UsersService } from 'src/modules/users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const usersService = {
    findActiveUserAuthById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: reflector,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
  });

  it('adds tenantId to the authenticated request user', async () => {
    const request: any = {
      headers: {
        authorization: 'Bearer access-token',
      },
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      userId: 'user-1',
      role: UserRole.ADMIN,
      tenantId: 'tenant-1',
      tokenVersion: 3,
    });
    usersService.findActiveUserAuthById.mockResolvedValue({
      _id: 'user-1',
      tenantId: 'tenant-1',
      role: UserRole.ADMIN,
      tokenVersion: 3,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.user).toEqual({
      sub: 'user-1',
      userId: 'user-1',
      role: UserRole.ADMIN,
      tenantId: 'tenant-1',
      tokenVersion: 3,
    });
  });

  it('rejects revoked tokens', async () => {
    const request: any = {
      headers: {
        authorization: 'Bearer access-token',
      },
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      tokenVersion: 1,
    });
    usersService.findActiveUserAuthById.mockResolvedValue({
      _id: 'user-1',
      tenantId: 'tenant-1',
      role: UserRole.ADMIN,
      tokenVersion: 2,
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
