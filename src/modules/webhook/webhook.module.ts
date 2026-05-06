import { Module } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { FlowModule } from '../flow/flow.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    ConversationsModule,
    MessagesModule,
    FlowModule,
    NotificationsModule,
    StorageModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WhatsAppService],
})
export class WebhookModule {}
