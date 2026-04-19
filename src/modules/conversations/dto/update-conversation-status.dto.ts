import { IsEnum } from 'class-validator';
import { ConversationStatus } from 'src/common/enums/conversation-status.enum';

export class UpdateConversationStatusDto {
  @IsEnum(ConversationStatus)
  status: ConversationStatus;
}
