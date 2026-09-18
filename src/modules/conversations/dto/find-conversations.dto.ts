import {
  IsBooleanString,
  IsEnum,
  IsMongoId,
  IsOptional,
  Matches,
} from 'class-validator';
import { ConversationStatus } from 'src/common/enums/conversation-status.enum';

export class FindConversationsDto {
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @IsOptional()
  @IsBooleanString()
  isClosedSale?: string;

  @IsOptional()
  @IsBooleanString()
  isPotentialSale?: string;

  @IsOptional()
  @Matches(/^[1-9]\d*$/)
  page?: string;

  @IsOptional()
  @Matches(/^[1-9]\d*$/)
  limit?: string;
}
