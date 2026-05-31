import { ApiProperty } from '@nestjs/swagger';
import { OtpPurpose } from '@prisma/client';
import { IsEnum, IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/)
  phone!: string;

  @ApiProperty({ enum: OtpPurpose, default: OtpPurpose.LOGIN })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose = OtpPurpose.LOGIN;
}
