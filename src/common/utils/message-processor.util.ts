import { MessageType } from '../enums/message-type.enum';

export interface ProcessedMessage {
  type: MessageType;
  text?: string;
}

export function processIncomingMessage(message: any): ProcessedMessage {
  if (message.text) {
    return {
      type: MessageType.TEXT,
      text: message.text.body,
    };
  }

  if (message.image) {
    return {
      type: MessageType.IMAGE,
    };
  }

  if (message.audio) {
    return {
      type: MessageType.AUDIO,
    };
  }

  if (message.sticker) {
    return {
      type: MessageType.STICKER,
    };
  }

  if (message.document) {
    return {
      type: MessageType.DOCUMENT,
    };
  }

  return {
    type: MessageType.TEXT,
    text: '',
  };
}
