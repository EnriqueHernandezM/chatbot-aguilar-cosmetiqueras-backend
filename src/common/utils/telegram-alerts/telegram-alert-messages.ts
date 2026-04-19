export const telegramAlertMessages = {
  metaSendFailure: (
    action: 'sendText' | 'sendImage',
    to: string,
    detail: string,
  ) =>
    [
      '[SYSTEM] Falla enviando mensaje a Meta',
      `Action: ${action}`,
      `To: ${to}`,
      `Detail: ${detail}`,
    ].join('\n'),

  openAiFailure: (detail: string, originalMessage: string) =>
    [
      '[SYSTEM] Falla en ChatGPT',
      `Detail: ${detail}`,
      `Input: ${originalMessage}`,
    ].join('\n'),

  waitingHumanNewMessage: (
    waId: string,
    conversationId: string,
    preview: string,
  ) =>
    [
      '[ALL] Nuevo mensaje en waiting_human',
      `ConversationId: ${conversationId}`,
      `WaId: ${waId}`,
      `Message: ${preview}`,
    ].join('\n'),
};
