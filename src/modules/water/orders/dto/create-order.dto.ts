import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { WaterPaymentStatus, WaterRole } from '../../common/water.enums';

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  customer_id!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  address_id!: string;

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

  @ApiPropertyOptional({ minimum: 1, description: 'Actual delivery quantity in barrels for this order.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Ticket barrels planned to be used by this order. Cash/offline barrels are quantity - ticket_quantity_to_use.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ticket_quantity_to_use?: number;

  @ApiPropertyOptional({ description: 'V0 reuses this field as the delivery/barrel movement quantity for admin-created orders.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  barrel_quantity_to_return?: number;

  @ApiPropertyOptional({ description: 'V0 admin uses this as the cash/offline receivable amount for the order.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total_amount?: number;

  @ApiPropertyOptional({ enum: WaterPaymentStatus })
  @IsOptional()
  @IsEnum(WaterPaymentStatus)
  payment_status?: WaterPaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  created_by?: string;

  @ApiPropertyOptional({ enum: WaterRole })
  @IsOptional()
  @IsEnum(WaterRole)
  actor_role?: WaterRole;

  @ApiProperty({ description: 'Required for duplicate-safe order creation.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotency_key!: string;
}
