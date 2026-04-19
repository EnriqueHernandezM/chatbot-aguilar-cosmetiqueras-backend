import { IsMongoId } from 'class-validator';

export class FindMessagesDto {
  @IsMongoId()
  conversationId: string;
}
