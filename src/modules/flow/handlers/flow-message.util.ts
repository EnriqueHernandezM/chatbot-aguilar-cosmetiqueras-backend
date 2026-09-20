import {
  FlowMessage,
  FlowMessageContext,
  FlowResponseConfig,
} from '../interfaces/flow-config.interface';
import { FlowResponse } from '../interfaces/flow-response.interface';

export function resolveFlowMessage(
  message: FlowMessage,
  context: FlowMessageContext,
) {
  return typeof message === 'function' ? message(context) : message;
}

export function resolveFlowResponse(
  response: FlowResponseConfig,
  context: FlowMessageContext,
): FlowResponse {
  return {
    reply: resolveFlowMessage(response.reply, context),
    additionalReplies: response.additionalReplies?.map((reply) =>
      resolveFlowMessage(reply, context),
    ),
    nextState: response.nextState,
  };
}
