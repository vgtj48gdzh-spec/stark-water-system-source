import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RevealCustomerPhoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason!: string;
}
