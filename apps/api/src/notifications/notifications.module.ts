import { Global, Module } from '@nestjs/common';
import { NotificationChannelsProvider } from './providers/notification-channels.provider';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationChannelsProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
