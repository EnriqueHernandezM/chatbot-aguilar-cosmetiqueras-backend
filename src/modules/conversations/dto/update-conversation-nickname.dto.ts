import { IsOptional, IsString } from 'class-validator';

export class UpdateConversationNicknameDto {
  @IsOptional()
  @IsString()
  nickname: string | null;
}
