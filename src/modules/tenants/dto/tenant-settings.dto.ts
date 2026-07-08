import { IsBoolean, IsOptional } from 'class-validator';

export class TenantSettingsDto {
  @IsOptional()
  @IsBoolean()
  autoAssignConversations?: boolean;

  @IsOptional()
  @IsBoolean()
  allowHumanHandoff?: boolean;

  @IsOptional()
  @IsBoolean()
  botEnabled?: boolean;
}
