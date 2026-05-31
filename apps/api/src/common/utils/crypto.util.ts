import * as bcrypt from 'bcrypt';
import { createHash, randomInt } from 'crypto';

const BCRYPT_ROUNDS = 12;

export function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

export function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSecureToken(): string {
  return createHash('sha256')
    .update(`${Date.now()}-${randomInt(0, Number.MAX_SAFE_INTEGER)}`)
    .digest('hex');
}
