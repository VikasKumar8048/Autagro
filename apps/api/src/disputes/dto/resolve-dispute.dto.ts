import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const DISPUTE_OUTCOMES = ['REFUND_BUYER', 'RELEASE_SELLER', 'REJECT'] as const;

export class ResolveDisputeDto {
  @ApiProperty({ enum: ['UNDER_REVIEW', 'RESOLVED', 'REJECTED'] })
  @IsIn([DisputeStatus.UNDER_REVIEW, DisputeStatus.RESOLVED, DisputeStatus.REJECTED])
  status!: DisputeStatus;

  @ApiPropertyOptional({ enum: DISPUTE_OUTCOMES })
  @IsOptional()
  @IsIn(DISPUTE_OUTCOMES)
  outcome?: (typeof DISPUTE_OUTCOMES)[number];

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolution?: string;
}
