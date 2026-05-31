import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, UserStatus } from '@prisma/client';
import { AuthService } from './auth.service';
import { AuditService } from './services/audit.service';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    userProfile: { upsert: jest.fn() },
    session: { create: jest.fn() },
    $transaction: jest.fn((fn: (tx: typeof prisma) => unknown) => fn(prisma)),
  };

  const otp = { requestOtp: jest.fn(), verifyOtp: jest.fn() };
  const tokens = {
    issueTokenPair: jest.fn().mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 900,
    }),
  };
  const audit = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: OtpService, useValue: otp },
        { provide: TokenService, useValue: tokens },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('returns isNewUser when phone not registered', async () => {
    otp.verifyOtp.mockResolvedValue(true);
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await service.verifyOtp(
      { phone: '+919999999999', code: '123456', purpose: 'LOGIN' as never },
      {},
    );

    expect(result.isNewUser).toBe(true);
    expect(result.tokens.accessToken).toBe('');
  });

  it('issues tokens for existing user', async () => {
    otp.verifyOtp.mockResolvedValue(true);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      phone: '+919999999999',
      email: null,
      role: UserRole.SELLER,
      status: UserStatus.ACTIVE,
      profile: {
        fullName: 'Test',
        state: 'MH',
        district: 'Pune',
        pincode: '411001',
      },
    });
    prisma.user.update.mockResolvedValue({});
    prisma.session.create.mockResolvedValue({ id: 'session-1' });

    const result = await service.verifyOtp(
      { phone: '+919999999999', code: '123456', purpose: 'LOGIN' as never },
      {},
    );

    expect(result.isNewUser).toBe(false);
    expect(result.tokens.accessToken).toBe('access');
    expect(tokens.issueTokenPair).toHaveBeenCalled();
  });

  it('rejects invalid password login', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.loginWithPassword(
        { identifier: '+919999999999', password: 'Password1' },
        {},
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
});
