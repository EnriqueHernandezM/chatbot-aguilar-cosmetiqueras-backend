import { Module } from '@nestjs/common';
import { ConversationFlowService } from './conversation-flow.service';
import { LeadsModule } from '../leads/leads.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [LeadsModule, ConversationsModule],
  providers: [ConversationFlowService],
  exports: [ConversationFlowService],
})
export class FlowModule {}
