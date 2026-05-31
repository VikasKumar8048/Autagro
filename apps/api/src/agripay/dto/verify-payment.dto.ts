import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty()
  @IsString()
  @MinLength(4)
  razorpayOrderId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(4)
  razorpayPaymentId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(4)
  razorpaySignature!: string;
}
