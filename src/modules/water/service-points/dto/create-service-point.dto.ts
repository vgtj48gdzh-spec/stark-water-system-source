import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { WaterServicePointStatus } from '../../common/water.enums';

export class CreateServicePointDto {
  @ApiProperty()
  @IsString()
  service_point_name!: string;

  @ApiPropertyOptional({ enum: WaterServicePointStatus })
  @IsOptional()
  @IsEnum(WaterServicePointStatus)
  service_point_status?: WaterServicePointStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agent_id?: string;

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
  @IsBoolean()
  incubated_by_hq?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  created_by?: string;
}
