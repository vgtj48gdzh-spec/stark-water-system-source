import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { WaterBarrelStatus, WaterRole } from '../../common/water.enums';

export class CreateBarrelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  barrel_code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  qr_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  rfid_code?: string;

  @ApiPropertyOptional({ enum: WaterBarrelStatus })
  @IsOptional()
  @IsEnum(WaterBarrelStatus)
  barrel_status?: WaterBarrelStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  current_holder_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  current_holder_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  created_by?: string;

  @ApiPropertyOptional({ enum: WaterRole })
  @IsOptional()
  @IsEnum(WaterRole)
  actor_role?: WaterRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotency_key?: string;
}
