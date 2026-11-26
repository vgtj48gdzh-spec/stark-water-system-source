import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  WaterBarrelStatus,
  WaterDeliveryStatus,
  WaterOrderStatus,
  WaterPaymentStatus,
  WaterSyncStatus,
  WaterTicketStatus,
} from './water.enums';

export class WaterPageQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class CustomerListQueryDto extends WaterPageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  servicePointId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdTo?: string;
}

export class OrderListQueryDto extends WaterPageQueryDto {
  @ApiPropertyOptional({ enum: WaterOrderStatus })
  @IsOptional()
  @IsEnum(WaterOrderStatus)
  orderStatus?: WaterOrderStatus;

  @ApiPropertyOptional({ enum: WaterPaymentStatus })
  @IsOptional()
  @IsEnum(WaterPaymentStatus)
  paymentStatus?: WaterPaymentStatus;

  @ApiPropertyOptional({ enum: WaterDeliveryStatus })
  @IsOptional()
  @IsEnum(WaterDeliveryStatus)
  deliveryStatus?: WaterDeliveryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  servicePointId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdTo?: string;
}

export class TicketListQueryDto extends WaterPageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ enum: WaterPaymentStatus })
  @IsOptional()
  @IsEnum(WaterPaymentStatus)
  paymentStatus?: WaterPaymentStatus;

  @ApiPropertyOptional({ enum: WaterTicketStatus })
  @IsOptional()
  @IsEnum(WaterTicketStatus)
  ticketStatus?: WaterTicketStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  balanceGtZero?: boolean;
}

export class InventoryListQueryDto extends WaterPageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  servicePointId?: string;
}

export class InventoryMovementListQueryDto extends InventoryListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  movementType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdTo?: string;
}

export class BarrelListQueryDto extends WaterPageQueryDto {
  @ApiPropertyOptional({ enum: WaterBarrelStatus })
  @IsOptional()
  @IsEnum(WaterBarrelStatus)
  status?: WaterBarrelStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentHolderType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentHolderId?: string;
}

export class BusinessEventListQueryDto extends WaterPageQueryDto {
  @ApiPropertyOptional({ enum: WaterSyncStatus })
  @IsOptional()
  @IsEnum(WaterSyncStatus)
  syncStatus?: WaterSyncStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aggregateType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdTo?: string;
}

export class AuditLogListQueryDto extends WaterPageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdTo?: string;
}
