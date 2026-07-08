import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GalleryStatus = 'active' | 'archived' | 'deleted';

@Schema({ timestamps: true })
export class Gallery extends Document {
  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
  })
  uid: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  })
  tenantId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  uploadedBy: Types.ObjectId;

  @Prop({ required: true, trim: true })
  url: string;

  @Prop({ trim: true })
  publicId?: string;

  @Prop({ trim: true })
  originalName?: string;

  @Prop({ trim: true })
  mimeType?: string;

  @Prop({ type: Number })
  sizeBytes?: number;

  @Prop({ trim: true })
  title?: string;

  @Prop({ trim: true })
  caption?: string;

  @Prop({ trim: true })
  category?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
  })
  status: GalleryStatus;
}

export const GallerySchema = SchemaFactory.createForClass(Gallery);

GallerySchema.index({ tenantId: 1, createdAt: -1 });
GallerySchema.index({ tenantId: 1, url: 1 }, { unique: true });
