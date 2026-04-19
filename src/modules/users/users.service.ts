import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtUserPayload } from './interfaces/jwt-user-payload.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

  private hashPassword(value: string) {
    return createHash('sha512').update(value).digest('hex');
  }

  async createUser(payload: CreateUserDto) {
    const email = payload.email.trim().toLowerCase();
    const exists = await this.userModel.findOne({ email });

    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const user = await this.userModel.create({
      name: payload.name.trim(),
      email,
      passwordHash: this.hashPassword(payload.password),
      role: payload.role,
      active: true,
      tokenVersion: 0,
    });

    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    };
  }

  async login(payload: LoginUserDto) {
    const email = payload.email.trim().toLowerCase();
    const user = await this.userModel
      .findOne({ email, active: true })
      .select('+passwordHash tokenVersion role');

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = user.passwordHash === this.hashPassword(payload.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jwtPayload: JwtUserPayload = {
      sub: String(user._id),
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    };

    const accessToken = await this.jwtService.signAsync(jwtPayload);

    return {
      access_token: accessToken,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(bearerToken: string) {
    let payload: JwtUserPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtUserPayload>(bearerToken);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.userModel
      .findById(payload.sub)
      .select('tokenVersion');
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    if ((user.tokenVersion || 0) !== payload.tokenVersion) {
      throw new UnauthorizedException('Token revoked');
    }

    await this.userModel.updateOne(
      { _id: payload.sub },
      { $inc: { tokenVersion: 1 } },
    );

    return { status: 'session_closed' };
  }

  async findActiveUserAuthById(userId: string) {
    return this.userModel
      .findOne({ _id: userId, active: true })
      .select('tokenVersion role active');
  }
}
