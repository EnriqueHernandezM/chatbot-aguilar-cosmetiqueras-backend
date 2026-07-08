import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { UserRole } from 'src/common/enums/user-role.enum';
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const userSelect = jest.fn();
  const userModel = {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
    userModel.findOne.mockReturnValue({ select: userSelect });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates users with tenantId from the register body', async () => {
    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockResolvedValue({
      _id: 'user-1',
      tenantId: new Types.ObjectId('67e8a7b7b9d2f3a1c4d5e6bb'),
      name: 'Agente',
      email: 'agent@test.com',
      role: UserRole.AGENT,
      active: true,
    });

    const result = await service.createUser({
      tenantId: '67e8a7b7b9d2f3a1c4d5e6bb',
      name: ' Agente ',
      email: 'AGENT@test.com',
      password: 'secret1',
      role: UserRole.AGENT,
    });

    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: expect.any(Types.ObjectId),
        name: 'Agente',
        email: 'agent@test.com',
        role: UserRole.AGENT,
      }),
    );
    expect(result.tenantId).toBe('67e8a7b7b9d2f3a1c4d5e6bb');
  });

  it('signs login JWTs with tenantId from the persisted user', async () => {
    userSelect.mockResolvedValue({
      _id: 'user-1',
      tenantId: 'tenant-1',
      name: 'Admin',
      email: 'admin@test.com',
      passwordHash:
        'bd2b1aaf7ef4f09be9f52ce2d8d599674d81aa9d6a4421696dc4d93dd0619d682ce56b4d64a9ef097761ced99e0f67265b5f76085e5b0ee7ca4696b2ad6fe2b2',
      role: UserRole.ADMIN,
      tokenVersion: 2,
    });
    jwtService.signAsync.mockResolvedValue('access-token');

    const result = await service.login({
      email: 'ADMIN@test.com',
      password: 'secret',
    });

    expect(userModel.findOne).toHaveBeenCalledWith({
      email: 'admin@test.com',
      active: true,
    });
    expect(userSelect).toHaveBeenCalledWith(
      '+passwordHash tokenVersion role tenantId',
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      userId: 'user-1',
      role: UserRole.ADMIN,
      tenantId: 'tenant-1',
      tokenVersion: 2,
    });
    expect(result.access_token).toBe('access-token');
  });

  it('rejects login when credentials are invalid', async () => {
    userSelect.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'admin@test.com',
        password: 'secret',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
