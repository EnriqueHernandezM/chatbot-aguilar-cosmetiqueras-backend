import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../../common/enums/user-role.enum';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({
    unique: true,
    index: true,
    sparse: true,
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

  @Prop({ required: true })
  name: string;
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.AGENT,
  })
  role: UserRole;

  @Prop({ default: true })
  active: boolean;

  @Prop({
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'active',
  })
  status: UserStatus;

  @Prop({ default: 0 })
  tokenVersion: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
