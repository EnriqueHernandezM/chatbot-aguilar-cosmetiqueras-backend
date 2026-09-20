import { Injectable } from '@nestjs/common';

import {
  FlowMessageContext,
  FlowStepHandler,
  OpenQuestionFlowStep,
} from '../interfaces/flow-config.interface';
import { FlowResponse } from '../interfaces/flow-response.interface';
import { resolveFlowResponse } from './flow-message.util';

@Injectable()
export class OpenQuestionHandler
  implements FlowStepHandler<OpenQuestionFlowStep>
{
  readonly type = 'open_question' as const;

  handle(
    step: OpenQuestionFlowStep,
    context: FlowMessageContext,
  ): FlowResponse {
    return resolveFlowResponse(step.response, context);
  }
}
