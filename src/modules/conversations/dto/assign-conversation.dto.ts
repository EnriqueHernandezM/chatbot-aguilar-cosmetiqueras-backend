import { IsMongoId } from 'class-validator';

export class AssignConversationDto {
  @IsMongoId()
  userId: string;
}
