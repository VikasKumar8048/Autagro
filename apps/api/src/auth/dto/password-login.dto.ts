import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class PasswordLoginDto {
  @ApiProperty({ description: 'Phone or email', example: '+919876543210' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  identifier!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
