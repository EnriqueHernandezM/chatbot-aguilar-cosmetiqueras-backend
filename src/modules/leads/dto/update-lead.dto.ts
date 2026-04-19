import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { LeadStatus } from 'src/common/enums/lead-status.enum';

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  product?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;
}
