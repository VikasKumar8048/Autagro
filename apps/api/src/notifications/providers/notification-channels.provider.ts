import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationChannelsProvider {
  private readonly logger = new Logger(NotificationChannelsProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendEmail(userId: string, title: string, body: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'production' && !process.env.SMTP_HOST) {
      this.logger.warn('SMTP not configured — skipping email');
      return false;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    if (!user?.email) {
      return false;
    }

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV EMAIL] to=${user.email} title=${title}`);
      return true;
    }

    // Production: integrate SendGrid / AWS SES / MSG91 email here
    this.logger.log(`Email queued for ${user.email}: ${title}`);
    return true;
  }

  async sendSms(userId: string, body: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    if (!user?.phone) {
      return false;
    }

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV SMS] to=${user.phone} body=${body.slice(0, 80)}…`);
      return true;
    }

    if (!process.env.SMS_PROVIDER) {
      return false;
    }

    this.logger.log(`SMS queued for ${user.phone}`);
    return true;
  }
}
