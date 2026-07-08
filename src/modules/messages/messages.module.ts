import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Message, MessageSchema } from './schemas/message.schema';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import {
  Conversation,
  ConversationSchema,
} from '../conversations/schemas/conversation.schema';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { Tenant, TenantSchema } from '../tenants/schemas/tenant.schema';
import { GalleryModule } from '../gallery/gallery.module';

@Module({
  imports: [
    GalleryModule,
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
  ],
  providers: [MessagesService, WhatsAppService],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}
