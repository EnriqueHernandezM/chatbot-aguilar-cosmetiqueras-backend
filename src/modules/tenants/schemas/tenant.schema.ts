import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TenantPlan = 'free' | 'pro' | 'enterprise';

@Schema({ timestamps: true, collection: 'tenants' })
export class Tenant extends Document {
  @Prop({ required: true, unique: true, index: true, trim: true })
  uid: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ type: Boolean, default: true })
  active: boolean;

  @Prop({
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free',
  })
  plan: TenantPlan;

  @Prop({
    type: {
      phoneNumberId: { type: String, trim: true },
      businessAccountId: { type: String, trim: true },
      accessToken: { type: String, trim: true },
      webhookVerifyToken: { type: String, trim: true },
      appId: { type: String, trim: true },
    },
    default: {},
  })
  whatsapp: {
    phoneNumberId?: string;
    businessAccountId?: string;
    accessToken?: string;
    webhookVerifyToken?: string;
    appId?: string;
  };

  @Prop({
    type: {
      businessName: { type: String, trim: true },
      logoUrl: { type: String, trim: true },
      primaryColor: { type: String, trim: true },
    },
    default: {},
  })
  branding: {
    businessName?: string;
    logoUrl?: string;
    primaryColor?: string;
  };

  @Prop({
    type: {
      autoAssignConversations: { type: Boolean, default: false },
      allowHumanHandoff: { type: Boolean, default: true },
      botEnabled: { type: Boolean, default: true },
    },
    default: {},
  })
  settings: {
    autoAssignConversations: boolean;
    allowHumanHandoff: boolean;
    botEnabled: boolean;
  };
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
