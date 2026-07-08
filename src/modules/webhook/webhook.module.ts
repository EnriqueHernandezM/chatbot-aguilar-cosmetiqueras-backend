import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { FlowModule } from '../flow/flow.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';

@Module({
  imports: [
    ConversationsModule,
    MessagesModule,
    FlowModule,
    NotificationsModule,
    StorageModule,
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WhatsAppService],
})
export class WebhookModule {}
