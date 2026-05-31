import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { OtpPurpose, UserRole, UserStatus } from '@prisma/client';
import { hashPassword, verifyPassword } from '../common/utils/crypto.util';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { PasswordLoginDto } from './dto/password-login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { TokenPair } from './interfaces/jwt-payload.interface';
import { AuditService } from './services/audit.service';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';

export interface AuthResponse {
  user: {
    id: string;
    phone: string;
    email: string | null;
    role: UserRole;
    status: UserStatus;
    profile: {
      fullName: string;
      state: string;
      district: string;
      pincode: string;
    } | null;
  };
  tokens: TokenPair;
  isNewUser: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async requestOtp(dto: RequestOtpDto, meta: RequestMeta) {
    const result = await this.otp.requestOtp(dto.phone, dto.purpose);
    await this.audit.log({
      action: 'OTP_REQUESTED',
      resource: 'auth',
      metadata: { phone: dto.phone, purpose: dto.purpose },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return { message: 'OTP sent successfully', ...result };
  }

  async verifyOtp(dto: VerifyOtpDto, meta: RequestMeta): Promise<AuthResponse> {
    await this.otp.verifyOtp(dto.phone, dto.code, dto.purpose);

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { profile: true },
    });

    if (!user) {
      if (dto.purpose !== OtpPurpose.LOGIN && dto.purpose !== OtpPurpose.REGISTER) {
        throw new BadRequestException('User not found. Complete registration first.');
      }
      return {
        user: {
          id: '',
          phone: dto.phone,
          email: null,
          role: UserRole.BUYER,
          status: UserStatus.PENDING_VERIFICATION,
          profile: null,
        },
        tokens: { accessToken: '', refreshToken: '', expiresIn: 0 },
        isNewUser: true,
      };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerifiedAt: new Date(),
        status: user.status === UserStatus.PENDING_VERIFICATION ? UserStatus.ACTIVE : user.status,
        lastLoginAt: new Date(),
      },
    });

    const tokens = await this.createSessionAndTokens(user.id, user.role, meta);

    await this.audit.log({
      userId: user.id,
      action: 'OTP_VERIFIED',
      resource: 'auth',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      user: this.mapUser(user),
      tokens,
      isNewUser: false,
    };
  }

  async register(dto: RegisterDto, meta: RequestMeta): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { profile: true },
    });
    if (existing?.profile) {
      throw new ConflictException('User already registered');
    }

    const passwordHash = dto.password ? await hashPassword(dto.password) : null;

    const user = await this.prisma.$transaction(async (tx) => {
      const upserted = await tx.user.upsert({
        where: { phone: dto.phone },
        create: {
          phone: dto.phone,
          email: dto.email,
          passwordHash,
          role: dto.role,
          status: UserStatus.ACTIVE,
          phoneVerifiedAt: new Date(),
        },
        update: {
          email: dto.email ?? undefined,
          passwordHash: passwordHash ?? undefined,
          role: dto.role,
          status: UserStatus.ACTIVE,
          phoneVerifiedAt: new Date(),
        },
      });

      await tx.userProfile.upsert({
        where: { userId: upserted.id },
        create: {
          userId: upserted.id,
          fullName: dto.fullName,
          state: dto.state,
          district: dto.district,
          pincode: dto.pincode,
        },
        update: {
          fullName: dto.fullName,
          state: dto.state,
          district: dto.district,
          pincode: dto.pincode,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: upserted.id },
        include: { profile: true },
      });
    });

    const tokens = await this.createSessionAndTokens(user.id, user.role, meta);

    await this.audit.log({
      userId: user.id,
      action: 'USER_REGISTERED',
      resource: 'user',
      resourceId: user.id,
      metadata: { role: user.role },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    return { user: this.mapUser(user), tokens, isNewUser: !existing };
  }

  async loginWithPassword(dto: PasswordLoginDto, meta: RequestMeta): Promise<AuthResponse> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: dto.identifier }, { email: dto.identifier }],
      },
      include: { profile: true },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('Account is not active');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.createSessionAndTokens(user.id, user.role, meta);

    await this.audit.log({
      userId: user.id,
      action: 'PASSWORD_LOGIN',
      resource: 'auth',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    return { user: this.mapUser(user), tokens, isNewUser: false };
  }

  async refresh(rawRefreshToken: string, meta: RequestMeta): Promise<TokenPair> {
    const result = await this.tokens.rotateRefreshToken(rawRefreshToken, {
      userAgent: meta.userAgent,
      ipAddress: meta.ip,
    });
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    };
  }

  async logout(userId: string, refreshToken: string | undefined, sessionId?: string) {
    if (refreshToken) {
      await this.tokens.revokeRefreshToken(refreshToken);
    }
    if (sessionId) {
      await this.prisma.session.updateMany({
        where: { id: sessionId, userId },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit.log({ userId, action: 'LOGOUT', resource: 'auth' });
  }

  async logoutAll(userId: string) {
    await this.tokens.revokeAllUserTokens(userId);
    await this.audit.log({ userId, action: 'LOGOUT_ALL', resource: 'auth' });
  }

  async forgotPassword(dto: ForgotPasswordDto, meta: RequestMeta) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      return { message: 'If the phone exists, an OTP has been sent' };
    }
    await this.otp.requestOtp(dto.phone, OtpPurpose.PASSWORD_RESET);
    await this.audit.log({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'auth',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return { message: 'If the phone exists, an OTP has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto, meta: RequestMeta) {
    await this.otp.verifyOtp(dto.phone, dto.code, OtpPurpose.PASSWORD_RESET);
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    await this.tokens.revokeAllUserTokens(user.id);
    await this.audit.log({
      userId: user.id,
      action: 'PASSWORD_RESET',
      resource: 'auth',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return { message: 'Password reset successful. Please login again.' };
  }

  async listSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastActive: 'desc' },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        ipAddress: true,
        lastActive: true,
        createdAt: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new BadRequestException('Password not set. Use OTP login or set password first.');
    }
    const valid = await verifyPassword(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(dto.newPassword) },
    });
    await this.tokens.revokeAllUserTokens(userId);
    await this.audit.log({ userId, action: 'PASSWORD_CHANGED', resource: 'user' });
    return { message: 'Password updated. All sessions revoked.' };
  }

  private async createSessionAndTokens(
    userId: string,
    role: UserRole,
    meta: RequestMeta,
  ): Promise<TokenPair> {
    const session = await this.prisma.session.create({
      data: {
        userId,
        userAgent: meta.userAgent,
        ipAddress: meta.ip,
        deviceName: parseDeviceName(meta.userAgent),
      },
    });
    return this.tokens.issueTokenPair(userId, role, session.id, meta);
  }

  private mapUser(
    user: {
      id: string;
      phone: string;
      email: string | null;
      role: UserRole;
      status: UserStatus;
      profile: {
        fullName: string;
        state: string;
        district: string;
        pincode: string;
      } | null;
    },
  ) {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
      profile: user.profile
        ? {
            fullName: user.profile.fullName,
            state: user.profile.state,
            district: user.profile.district,
            pincode: user.profile.pincode,
          }
        : null,
    };
  }
}

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

function parseDeviceName(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;
  if (userAgent.includes('Mobile')) return 'Mobile Browser';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  return 'Web Browser';
}
