import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/)
  phone!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty({ example: 'Rajesh Kumar' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password?: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  state!: string;

  @ApiProperty({ example: 'Pune' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  district!: string;

  @ApiProperty({ example: '411001' })
  @IsString()
  @Matches(/^\d{6}$/)
  pincode!: string;
}
