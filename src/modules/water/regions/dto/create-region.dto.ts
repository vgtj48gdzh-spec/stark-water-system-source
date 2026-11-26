import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateRegionDto {
  @ApiProperty()
  @IsString()
  region_name!: string;

  @ApiProperty()
  @IsString()
  region_code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parent_region_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manager_user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  created_by?: string;
}
