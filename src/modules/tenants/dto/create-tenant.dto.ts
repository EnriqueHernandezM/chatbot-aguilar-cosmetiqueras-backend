import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { TenantPlan } from '../schemas/tenant.schema';
import { TenantBrandingDto } from './tenant-branding.dto';
import { TenantSettingsDto } from './tenant-settings.dto';
import { TenantWhatsappDto } from './tenant-whatsapp.dto';

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  uid: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  slug: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsIn(['free', 'pro', 'enterprise'])
  plan?: TenantPlan;

  @IsOptional()
  @ValidateNested()
  @Type(() => TenantWhatsappDto)
  whatsapp?: TenantWhatsappDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TenantBrandingDto)
  branding?: TenantBrandingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TenantSettingsDto)
  settings?: TenantSettingsDto;
}
