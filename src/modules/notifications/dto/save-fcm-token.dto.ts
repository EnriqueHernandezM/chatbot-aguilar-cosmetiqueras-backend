import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class SaveFcmTokenDto {
  @IsString()
  @MinLength(10)
  token: string;

  @IsString()
  @IsIn(['web', 'android', 'ios'])
  platform: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
