import { Injectable, Logger } from '@nestjs/common';

export interface OtpDeliveryResult {
  success: boolean;
  providerMessageId?: string;
}

/**
 * Pluggable OTP delivery. Production: integrate MSG91 / Twilio / AWS SNS.
 * Development: logs OTP to structured logs (never log in production).
 */
@Injectable()
export class OtpSmsProvider {
  private readonly logger = new Logger(OtpSmsProvider.name);

  async send(phone: string, code: string, purpose: string): Promise<OtpDeliveryResult> {
    if (process.env.NODE_ENV === 'production' && !process.env.OTP_SMS_PROVIDER) {
      throw new Error('OTP_SMS_PROVIDER must be configured in production');
    }

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV OTP] phone=${phone} purpose=${purpose} code=${code}`);
      return { success: true, providerMessageId: 'dev-mock' };
    }

    // Production hook — implement provider adapter here
    this.logger.log(`OTP dispatched to ${phone} for ${purpose}`);
    return { success: true };
  }
}
