import {
  IsBoolean,
  IsEnum,
  IsDefined,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageFrom } from 'src/common/enums/message-from.enum';
import { MessageType } from 'src/common/enums/message-type.enum';

export class SendMessageDto {
  @IsMongoId()
  conversationId: string;

  @IsEnum(MessageFrom)
  from: MessageFrom;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @IsDefined()
  content: string | string[];

  @IsOptional()
  @IsString()
  waMessageId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  internalNote?: boolean;

  @IsOptional()
  @IsIn(['device', 'gallery'])
  source?: 'device' | 'gallery';

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsString()
  originalName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sizeBytes?: number;

  @IsOptional()
  @IsString()
  caption?: string;
}
