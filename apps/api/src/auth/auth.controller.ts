import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { PasswordLoginDto } from './dto/password-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

function extractMeta(req: Request) {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post('otp/request')
  @ApiOperation({ summary: 'Request OTP for phone login' })
  requestOtp(@Body() dto: RequestOtpDto, @Req() req: Request) {
    return this.auth.requestOtp(dto, extractMeta(req));
  }

  @Public()
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post('otp/verify')
  @ApiOperation({ summary: 'Verify OTP and issue tokens' })
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    return this.auth.verifyOtp(dto, extractMeta(req));
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Complete registration after OTP' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, extractMeta(req));
  }

  @Public()
  @Post('login/password')
  @ApiOperation({ summary: 'Login with phone/email and password' })
  loginPassword(@Body() dto: PasswordLoginDto, @Req() req: Request) {
    return this.auth.loginWithPassword(dto, extractMeta(req));
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token' })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, extractMeta(req));
  }

  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Logout current session' })
  logout(
    @CurrentUser() user: JwtPayload,
    @Body() body: Partial<RefreshTokenDto>,
  ) {
    return this.auth.logout(user.sub, body.refreshToken, user.sessionId);
  }

  @ApiBearerAuth()
  @Post('logout-all')
  @ApiOperation({ summary: 'Revoke all sessions' })
  logoutAll(@CurrentUser() user: JwtPayload) {
    return this.auth.logoutAll(user.sub);
  }

  @Public()
  @Post('password/forgot')
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.auth.forgotPassword(dto, extractMeta(req));
  }

  @Public()
  @Post('password/reset')
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.auth.resetPassword(dto, extractMeta(req));
  }

  @ApiBearerAuth()
  @Get('sessions')
  @ApiOperation({ summary: 'List active sessions' })
  sessions(@CurrentUser() user: JwtPayload) {
    return this.auth.listSessions(user.sub);
  }
}
