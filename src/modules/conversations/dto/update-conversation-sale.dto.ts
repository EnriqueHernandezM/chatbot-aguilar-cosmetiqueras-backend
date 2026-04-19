import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateConversationSaleDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPotentialSale?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isClosedSale?: boolean;
}
