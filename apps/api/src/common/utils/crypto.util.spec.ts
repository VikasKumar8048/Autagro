import {
  generateOtpCode,
  hashOtp,
  hashPassword,
  verifyPassword,
} from './crypto.util';

describe('crypto.util', () => {
  it('generates 6-digit OTP', () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('hashes OTP consistently', () => {
    expect(hashOtp('123456')).toBe(hashOtp('123456'));
    expect(hashOtp('123456')).not.toBe(hashOtp('654321'));
  });

  it('hashes and verifies password', async () => {
    const hash = await hashPassword('SecurePass1');
    expect(await verifyPassword('SecurePass1', hash)).toBe(true);
    expect(await verifyPassword('WrongPass1', hash)).toBe(false);
  });
});
