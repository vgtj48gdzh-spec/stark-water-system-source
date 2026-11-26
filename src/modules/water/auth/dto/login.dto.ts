import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class WaterLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password!: string;
}
