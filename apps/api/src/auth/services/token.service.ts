import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import {
  generateSecureToken,
  hashToken,
} from '../../common/utils/crypto.util';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload, TokenPair } from '../interfaces/jwt-payload.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async issueTokenPair(
    userId: string,
    role: JwtPayload['role'],
    sessionId: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    const familyId = uuidv4();
    const refreshToken = generateSecureToken();
    const refreshTtl = Number(this.config.get('JWT_REFRESH_TTL', 604800));
    const accessTtl = Number(this.config.get('JWT_ACCESS_TTL', 900));

    const refreshRecord = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
    });

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { refreshId: refreshRecord.id },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: userId, role, sessionId } satisfies JwtPayload,
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl,
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
    };
  }

  async rotateRefreshToken(
    rawRefreshToken: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair & { userId: string; role: JwtPayload['role']; sessionId: string }> {
    const tokenHash = hashToken(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    if (existing.user.status !== 'ACTIVE' && existing.user.status !== 'PENDING_VERIFICATION') {
      throw new UnauthorizedException('Account is not active');
    }

    const session = await this.prisma.session.findFirst({
      where: { refreshId: existing.id, revokedAt: null },
    });

    if (!session) {
      await this.revokeTokenFamily(existing.familyId);
      throw new UnauthorizedException('Session invalid — please login again');
    }

    const newRefresh = generateSecureToken();
    const refreshTtl = Number(this.config.get('JWT_REFRESH_TTL', 604800));

    const newRecord = await this.prisma.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: hashToken(newRefresh),
        familyId: existing.familyId,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
    });

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedBy: newRecord.id },
    });

    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshId: newRecord.id, lastActive: new Date() },
    });

    const accessTtl = Number(this.config.get('JWT_ACCESS_TTL', 900));
    const accessToken = await this.jwt.signAsync(
      {
        sub: existing.userId,
        role: existing.user.role,
        sessionId: session.id,
      } satisfies JwtPayload,
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl,
      },
    );

    return {
      accessToken,
      refreshToken: newRefresh,
      expiresIn: accessTtl,
      userId: existing.userId,
      role: existing.user.role,
      sessionId: session.id,
    };
  }

  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    const token = await this.prisma.refreshToken.findFirst({ where: { tokenHash } });
    if (token) {
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  async revokeTokenFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
