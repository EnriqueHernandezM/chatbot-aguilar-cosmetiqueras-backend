import { Injectable } from '@nestjs/common';

import { parseQuoteMessage } from '../../../common/utils/ai-parser.util';
import { ConversationsService } from '../../conversations/conversations.service';
import { LeadsService } from '../../leads/leads.service';
import {
  CaptureQuoteDataFlowStep,
  FlowMessageContext,
  FlowStepHandler,
} from '../interfaces/flow-config.interface';
import { FlowResponse } from '../interfaces/flow-response.interface';
import { resolveFlowResponse } from './flow-message.util';

@Injectable()
export class CaptureQuoteDataHandler
  implements FlowStepHandler<CaptureQuoteDataFlowStep>
{
  readonly type = 'capture_quote_data' as const;

  constructor(
    private readonly leadsService: LeadsService,
    private readonly conversationsService: ConversationsService,
  ) {}

  async handle(
    step: CaptureQuoteDataFlowStep,
    context: FlowMessageContext,
  ): Promise<FlowResponse> {
    const parsed = await parseQuoteMessage(context.message);

    if (!parsed || !parsed.quantity || !parsed.product) {
      return resolveFlowResponse(step.invalidQuoteResponse, context);
    }

    await this.leadsService.createLead({
      conversationId: context.conversation._id,
      name: parsed.name || 'Cliente',
      quantity: parsed.quantity,
      product: parsed.product,
      location: parsed.location || null,
    });

    await this.conversationsService.markAsPotentialSale(
      String(context.conversation._id),
    );

    return resolveFlowResponse(step.successResponse, context);
  }
}
