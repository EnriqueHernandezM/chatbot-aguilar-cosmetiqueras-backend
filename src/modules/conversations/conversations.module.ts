import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Message, MessageSchema } from '../messages/schemas/message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: User.name, schema: UserSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  providers: [ConversationsService],
  controllers: [ConversationsController],
  exports: [ConversationsService],
})
export class ConversationsModule {}
