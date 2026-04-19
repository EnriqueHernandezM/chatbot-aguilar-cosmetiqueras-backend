import { IsDateString } from 'class-validator';

export class GetConversationUpdatesDto {
  @IsDateString()
  since: string;
}
