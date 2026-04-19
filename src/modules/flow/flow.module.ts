import { Module } from '@nestjs/common';
import { ConversationFlowService } from './conversation-flow.service';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [LeadsModule],
  providers: [ConversationFlowService],
  exports: [ConversationFlowService],
})
export class FlowModule {}
