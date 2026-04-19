import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../../../common/enums/user-role.enum';

@Schema({ timestamps: true })
export class User extends Document {
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

  @Prop({ default: 0 })
  tokenVersion: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
