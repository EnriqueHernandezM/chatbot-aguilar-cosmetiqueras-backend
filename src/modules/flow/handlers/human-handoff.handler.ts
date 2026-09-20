import { Injectable } from '@nestjs/common';

import {
  FlowMessageContext,
  FlowStepHandler,
  HumanHandoffFlowStep,
} from '../interfaces/flow-config.interface';

@Injectable()
export class HumanHandoffHandler
  implements FlowStepHandler<HumanHandoffFlowStep>
{
  readonly type = 'human_handoff' as const;

  handle(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    step: HumanHandoffFlowStep,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: FlowMessageContext,
  ) {
    return null;
  }
}
