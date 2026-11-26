import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { WaterAgentStatus } from '../../common/water.enums';

export class CreateAgentDto {
  @ApiProperty()
  @IsString()
  agent_name!: string;

  @ApiPropertyOptional({ enum: WaterAgentStatus })
  @IsOptional()
  @IsEnum(WaterAgentStatus)
  agent_status?: WaterAgentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contact_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contact_phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  deposit_required_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  base_sales_volume?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  created_by?: string;
}
