import { Types } from 'mongoose';

export interface CreateLeadPayload {
  conversationId: string | Types.ObjectId;
  name: string;
  quantity: number;
  product: string;
}
