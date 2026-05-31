import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  TooManyRequestsException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import { generateOtpCode, hashOtp } from '../../common/utils/crypto.util';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { OtpSmsProvider } from '../providers/otp-sms.provider';

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly sms: OtpSmsProvider,
  ) {}

  async requestOtp(phone: string, purpose: OtpPurpose): Promise<{ expiresIn: number }> {
    await this.enforceRateLimit(phone);

    const ttl = Number(this.config.get('OTP_TTL_SECONDS', 300));
    const code = generateOtpCode();

    await this.prisma.otpChallenge.create({
      data: {
        phone,
        purpose,
        codeHash: hashOtp(code),
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });

    await this.sms.send(phone, code, purpose);

    return { expiresIn: ttl };
  }

  async verifyOtp(phone: string, code: string, purpose: OtpPurpose): Promise<boolean> {
    const maxAttempts = Number(this.config.get('OTP_MAX_ATTEMPTS', 5));

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        phone,
        purpose,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new BadRequestException('OTP expired or not found. Request a new code.');
    }

    if (challenge.attempts >= maxAttempts) {
      throw new HttpException('Maximum OTP attempts exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    const valid = challenge.codeHash === hashOtp(code);

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        attempts: { increment: 1 },
        verified: valid,
      },
    });

    if (!valid) {
      throw new BadRequestException('Invalid OTP code');
    }

    return true;
  }

  private async enforceRateLimit(phone: string): Promise<void> {
    const limit = Number(this.config.get('OTP_RATE_LIMIT_PER_PHONE', 5));
    const window = Number(this.config.get('OTP_RATE_LIMIT_WINDOW_SECONDS', 3600));
    const key = `otp:rate:${phone}`;
    const count = await this.redis.incrementWithExpiry(key, window);

    if (count > limit) {
      throw new TooManyRequestsException(
        'Too many OTP requests. Please try again later.',
      );
    }
  }
}
