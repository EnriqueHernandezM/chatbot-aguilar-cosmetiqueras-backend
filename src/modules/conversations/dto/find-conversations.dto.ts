import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { ConversationStatus } from 'src/common/enums/conversation-status.enum';

export class FindConversationsDto {
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @IsOptional()
  @IsMongoId()
  assignedTo?: string;
}
