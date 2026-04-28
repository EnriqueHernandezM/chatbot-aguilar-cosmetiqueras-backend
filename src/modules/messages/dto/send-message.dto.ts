import {
  IsBoolean,
  IsEnum,
  IsDefined,
  IsMongoId,
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
}
