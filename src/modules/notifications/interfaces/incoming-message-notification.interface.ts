export interface IncomingMessageNotificationPayload {
  conversationId: string;
  phone: string;
  preview: string;
  assignedUserId?: string;
  handledBy?: 'bot';
}
