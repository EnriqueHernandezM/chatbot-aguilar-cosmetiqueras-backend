import { IsString, MinLength } from 'class-validator';

export class TestNotificationDto {
  @IsString()
  @MinLength(10)
  token: string;
}
