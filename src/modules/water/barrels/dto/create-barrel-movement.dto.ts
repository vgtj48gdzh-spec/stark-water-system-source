import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { WaterBarrelStatus, WaterRole } from '../../common/water.enums';

export class CreateBarrelMovementDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  movement_type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  from_holder_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  from_holder_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  to_holder_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  to_holder_id?: string;

  @ApiPropertyOptional({ enum: WaterBarrelStatus })
  @IsOptional()
  @IsEnum(WaterBarrelStatus)
  next_status?: WaterBarrelStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  created_by?: string;

  @ApiPropertyOptional({ enum: WaterRole })
  @IsOptional()
  @IsEnum(WaterRole)
  actor_role?: WaterRole;

  @ApiProperty({ description: 'Required for duplicate-safe barrel movement.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotency_key!: string;

  @ApiProperty({ description: 'Required for barrel responsibility traceability.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class ReturnBarrelDto {
  @ApiPropertyOptional({ default: 'SERVICE_POINT' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  to_holder_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  to_holder_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  created_by?: string;

  @ApiPropertyOptional({ enum: WaterRole })
  @IsOptional()
  @IsEnum(WaterRole)
  actor_role?: WaterRole;

  @ApiProperty({ description: 'Required for duplicate-safe barrel return.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotency_key!: string;

  @ApiProperty({ description: 'Required for barrel return traceability.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class MarkBarrelLostOrDamagedDto {
  @ApiProperty({ enum: [WaterBarrelStatus.Lost, WaterBarrelStatus.Damaged] })
  @IsIn([WaterBarrelStatus.Lost, WaterBarrelStatus.Damaged])
  status!: WaterBarrelStatus.Lost | WaterBarrelStatus.Damaged;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  created_by?: string;

  @ApiPropertyOptional({ enum: WaterRole })
  @IsOptional()
  @IsEnum(WaterRole)
  actor_role?: WaterRole;

  @ApiProperty({ description: 'Required for duplicate-safe barrel exception marking.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotency_key!: string;

  @ApiProperty({ description: 'Required for lost/damaged responsibility traceability.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
