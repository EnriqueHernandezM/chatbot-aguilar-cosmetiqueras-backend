import { MessageType } from '../enums/message-type.enum';

export interface ProcessedMessage {
  type: MessageType;
  text?: string;
  content?: string;
  imageId?: string;
  isSupported?: boolean;
}

export function processIncomingMessage(message: any): ProcessedMessage {
  const textBody = message.text?.body?.trim();

  if (textBody) {
    return {
      type: MessageType.TEXT,
      text: textBody,
    };
  }

  const buttonText = message.button?.text?.trim();

  if (buttonText) {
    return {
      type: MessageType.TEXT,
      text: buttonText,
      content: buttonText,
      isSupported: true,
    };
  }

  const interactiveText =
    message.interactive?.button_reply?.title?.trim() ||
    message.interactive?.list_reply?.title?.trim();

  if (interactiveText) {
    return {
      type: MessageType.TEXT,
      text: interactiveText,
      content: interactiveText,
      isSupported: true,
    };
  }

  if (message.image) {
    return {
      type: MessageType.IMAGE,
      text: message.image.caption?.trim(),
      content:
        message.image.id?.trim() ||
        message.image.caption?.trim() ||
        '[image]',
      imageId: message.image.id?.trim(),
      isSupported: true,
    };
  }

  if (message.audio) {
    return {
      type: MessageType.AUDIO,
      content: '[audio]',
      isSupported: true,
    };
  }

  if (message.sticker) {
    return {
      type: MessageType.STICKER,
      content: '[sticker]',
      isSupported: true,
    };
  }

  if (message.document) {
    return {
      type: MessageType.DOCUMENT,
      content: message.document.filename?.trim() || '[document]',
      isSupported: true,
    };
  }

  return {
    type: MessageType.TEXT,
    isSupported: false,
  };
}
