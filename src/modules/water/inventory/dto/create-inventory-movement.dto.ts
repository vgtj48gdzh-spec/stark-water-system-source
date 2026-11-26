import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { WaterInventoryMovementType, WaterRole } from '../../common/water.enums';

export class CreateInventoryMovementDto {
  @ApiProperty({ enum: WaterInventoryMovementType })
  @IsEnum(WaterInventoryMovementType)
  movement_type!: WaterInventoryMovementType;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  agent_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  service_point_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  related_order_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  related_purchase_order_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  created_by?: string;

  @ApiPropertyOptional({ enum: WaterRole })
  @IsOptional()
  @IsEnum(WaterRole)
  actor_role?: WaterRole;

  @ApiProperty({ description: 'Required for duplicate-safe inventory movement.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotency_key!: string;

  @ApiProperty({ description: 'Required for inventory traceability and stocktake adjustments.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
