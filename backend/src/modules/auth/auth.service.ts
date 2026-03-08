import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import argon2 from 'argon2';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service.js';
import {
  RefreshSession,
  RefreshSessionDocument,
} from '../../database/schemas/refresh-session.schema.js';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectModel(RefreshSession.name)
    private readonly refreshSessionModel: Model<RefreshSessionDocument>,
  ) {}

  private accessTtlSeconds = 15 * 60;
  private refreshTtlSeconds = 30 * 24 * 60 * 60;

  async register(payload: { name: string; email: string; password: string }) {
    const existing = await this.usersService.findByEmail(payload.email);
    if (existing) {
      throw new ConflictException('Email already exists.');
    }

    const passwordHash = await argon2.hash(payload.password);
    const user = await this.usersService.createUser({
      name: payload.name,
      email: payload.email,
      passwordHash,
    });

    const tokens = await this.issueTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  async login(payload: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordMatch = await argon2.verify(user.passwordHash, payload.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const tokens = await this.issueTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; sid: string; typ: string; email: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token type.');
    }

    if (!Types.ObjectId.isValid(payload.sid)) {
      throw new UnauthorizedException('Malformed refresh session id.');
    }

    const session = await this.refreshSessionModel
      .findOne({
        _id: payload.sid,
        userId: payload.sub,
      })
      .exec();

    if (!session) {
      throw new UnauthorizedException('Refresh session not found.');
    }

    if (session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh session expired.');
    }

    const isValidToken = await argon2.verify(session.tokenHash, refreshToken);
    if (!isValidToken) {
      throw new UnauthorizedException('Refresh token mismatch.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        typ: 'access',
      },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
        expiresIn: this.accessTtlSeconds,
      },
    );

    const nextRefreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        sid: session.id,
        email: user.email,
        typ: 'refresh',
      },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
        expiresIn: this.refreshTtlSeconds,
      },
    );

    session.tokenHash = await argon2.hash(nextRefreshToken);
    session.expiresAt = new Date(Date.now() + this.refreshTtlSeconds * 1000);
    await session.save();

    return {
      accessToken,
      refreshToken: nextRefreshToken,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required for logout.');
    }

    if (!refreshToken) {
      await this.refreshSessionModel.updateMany(
        { userId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
      return { success: true };
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sid: string;
      }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      });

      await this.refreshSessionModel.updateOne(
        { _id: payload.sid, userId },
        { $set: { revokedAt: new Date() } },
      );
    } catch {
      await this.refreshSessionModel.updateMany(
        { userId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
    }

    return { success: true };
  }

  private async issueTokens(userId: string, email: string): Promise<TokenPair> {
    const session = await this.refreshSessionModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash: 'pending',
      expiresAt: new Date(Date.now() + this.refreshTtlSeconds * 1000),
      revokedAt: null,
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email,
        typ: 'access',
      },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
        expiresIn: this.accessTtlSeconds,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
        sid: session.id,
        email,
        typ: 'refresh',
      },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
        expiresIn: this.refreshTtlSeconds,
      },
    );

    session.tokenHash = await argon2.hash(refreshToken);
    await session.save();

    return { accessToken, refreshToken };
  }
}

