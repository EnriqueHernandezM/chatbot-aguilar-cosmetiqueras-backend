import { Module } from '@nestjs/common';
import { ConversationFlowService } from './conversation-flow.service';
import { LeadsModule } from '../leads/leads.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { FlowRouterService } from './flow-router.service';
import {
  CaptureQuoteDataHandler,
  HumanHandoffHandler,
  InfoMessageHandler,
  MenuHandler,
  OpenQuestionHandler,
} from './handlers';
import { TenantFlowRouterService } from './tenant-flow-router.service';

@Module({
  imports: [LeadsModule, ConversationsModule],
  providers: [
    ConversationFlowService,
    FlowRouterService,
    MenuHandler,
    InfoMessageHandler,
    CaptureQuoteDataHandler,
    OpenQuestionHandler,
    HumanHandoffHandler,
    TenantFlowRouterService,
  ],
  exports: [ConversationFlowService, TenantFlowRouterService],
})
export class FlowModule {}
