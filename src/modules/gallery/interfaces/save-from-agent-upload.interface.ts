import { Types } from 'mongoose';

export interface SaveFromAgentUploadPayload {
  tenantId: string | Types.ObjectId;
  uploadedBy: string | Types.ObjectId;
  url: string;
  publicId?: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  title?: string;
  caption?: string;
  category?: string;
  tags?: string[];
}
