import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FcmToken, FcmTokenSchema } from './schemas/fcm-token.schema';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FcmToken.name, schema: FcmTokenSchema },
    ]),
  ],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
