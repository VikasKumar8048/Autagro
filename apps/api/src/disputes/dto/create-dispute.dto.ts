import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const DISPUTE_TYPES = [
  'QUALITY',
  'QUANTITY',
  'DELIVERY',
  'PAYMENT',
  'OTHER',
] as const;

export class CreateDisputeDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty({ enum: DISPUTE_TYPES })
  @IsIn(DISPUTE_TYPES)
  type!: (typeof DISPUTE_TYPES)[number];

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  evidenceUrls?: string[];
}
