import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { WaterPaymentStatus, WaterRole, WaterTicketPaymentMethod } from '../../common/water.enums';

export class SellTicketDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  customer_id!: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unit_price!: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ enum: WaterTicketPaymentMethod, description: 'V0 offline collection method.' })
  @IsOptional()
  @IsEnum(WaterTicketPaymentMethod)
  payment_method?: WaterTicketPaymentMethod;

  @ApiPropertyOptional({
    enum: WaterPaymentStatus,
    description: 'Default is pending confirmation for admin UI purchase orders.',
  })
  @IsOptional()
  @IsEnum(WaterPaymentStatus)
  payment_status?: WaterPaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  expires_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  created_by?: string;

  @ApiPropertyOptional({ enum: WaterRole })
  @IsOptional()
  @IsEnum(WaterRole)
  actor_role?: WaterRole;

  @ApiProperty({ description: 'Required for duplicate-safe ticket sale.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotency_key!: string;
}

export class UseTicketDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  customer_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  ticket_id?: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  related_order_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  created_by?: string;

  @ApiPropertyOptional({ enum: WaterRole })
  @IsOptional()
  @IsEnum(WaterRole)
  actor_role?: WaterRole;

  @ApiProperty({ description: 'Required for duplicate-safe ticket transaction.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotency_key!: string;
}

export class RefundTicketDto extends UseTicketDto {}

export class ConfirmTicketPaymentDto {
  @ApiProperty({ enum: WaterTicketPaymentMethod })
  @IsEnum(WaterTicketPaymentMethod)
  payment_method!: WaterTicketPaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  collection_remark?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  confirmed_by?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  created_by?: string;

  @ApiPropertyOptional({ enum: WaterRole })
  @IsOptional()
  @IsEnum(WaterRole)
  actor_role?: WaterRole;

  @ApiProperty({ description: 'Required for duplicate-safe payment confirmation.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotency_key!: string;
}

export class CancelTicketPurchaseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  updated_by?: string;

  @ApiPropertyOptional({ enum: WaterRole })
  @IsOptional()
  @IsEnum(WaterRole)
  actor_role?: WaterRole;

  @ApiProperty({ description: 'Required for duplicate-safe purchase cancellation.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotency_key!: string;
}
