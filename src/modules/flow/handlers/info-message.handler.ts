import { Injectable } from '@nestjs/common';

import {
  FlowMessageContext,
  FlowStepHandler,
  InfoMessageFlowStep,
} from '../interfaces/flow-config.interface';
import { FlowResponse } from '../interfaces/flow-response.interface';
import { resolveFlowResponse } from './flow-message.util';

@Injectable()
export class InfoMessageHandler
  implements FlowStepHandler<InfoMessageFlowStep>
{
  readonly type = 'info_message' as const;

  handle(
    step: InfoMessageFlowStep,
    context: FlowMessageContext,
  ): FlowResponse {
    return resolveFlowResponse(step.response, context);
  }
}
