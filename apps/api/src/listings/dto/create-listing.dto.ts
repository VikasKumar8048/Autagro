import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export enum CropUnit {
  KG = 'KG',
  QUINTAL = 'QUINTAL',
  TON = 'TON',
  BAG = 'BAG',
}

export class CreateListingDto {
  @ApiProperty({ example: 'Wheat' })
  @IsString()
  @MinLength(2)
  cropName!: string;

  @ApiProperty({ example: 'Sharbati' })
  @IsString()
  @MinLength(1)
  variety!: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @ApiProperty({ enum: CropUnit })
  @IsEnum(CropUnit)
  unit!: CropUnit;

  @ApiProperty({ example: 'A' })
  @IsString()
  grade!: string;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  harvestDate!: string;

  @ApiProperty({ example: 2500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  pricePerUnit!: number;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  state!: string;

  @ApiProperty({ example: 'Pune' })
  @IsString()
  district!: string;

  @ApiProperty({ example: '411001' })
  @Matches(/^\d{6}$/)
  pincode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}
