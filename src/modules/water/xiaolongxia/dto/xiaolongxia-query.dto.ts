import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WaterPageQueryDto } from '../../common/water-query.dto';
import {
  XiaolongxiaChannel,
  XiaolongxiaConversionType,
  XiaolongxiaKnowledgeCategory,
  XiaolongxiaKnowledgeStatus,
  XiaolongxiaPromoterType,
  XiaolongxiaRewardRuleStatus,
  XiaolongxiaRewardTrigger,
} from '../xiaolongxia.enums';

// V1 read-only query DTOs. No write DTOs exist in this skeleton round.

export class XiaolongxiaKnowledgeListQueryDto extends WaterPageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ enum: XiaolongxiaKnowledgeCategory })
  @IsOptional()
  @IsEnum(XiaolongxiaKnowledgeCategory)
  category?: XiaolongxiaKnowledgeCategory;

  @ApiPropertyOptional({ enum: XiaolongxiaKnowledgeStatus })
  @IsOptional()
  @IsEnum(XiaolongxiaKnowledgeStatus)
  status?: XiaolongxiaKnowledgeStatus;
}

export class XiaolongxiaPromotionRecordListQueryDto extends WaterPageQueryDto {
  @ApiPropertyOptional({ enum: XiaolongxiaPromoterType })
  @IsOptional()
  @IsEnum(XiaolongxiaPromoterType)
  promoterType?: XiaolongxiaPromoterType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promoterId?: string;

  @ApiPropertyOptional({ enum: XiaolongxiaChannel })
  @IsOptional()
  @IsEnum(XiaolongxiaChannel)
  channel?: XiaolongxiaChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campaignCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdTo?: string;
}

export class XiaolongxiaRewardRuleListQueryDto extends WaterPageQueryDto {
  @ApiPropertyOptional({ enum: XiaolongxiaRewardRuleStatus })
  @IsOptional()
  @IsEnum(XiaolongxiaRewardRuleStatus)
  status?: XiaolongxiaRewardRuleStatus;

  @ApiPropertyOptional({ enum: XiaolongxiaRewardTrigger })
  @IsOptional()
  @IsEnum(XiaolongxiaRewardTrigger)
  triggerEvent?: XiaolongxiaRewardTrigger;
}

export class XiaolongxiaGameSourceStatListQueryDto extends WaterPageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gameCode?: string;

  @ApiPropertyOptional({ enum: XiaolongxiaChannel })
  @IsOptional()
  @IsEnum(XiaolongxiaChannel)
  channel?: XiaolongxiaChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statDateTo?: string;
}

export class XiaolongxiaGameAttributionListQueryDto extends WaterPageQueryDto {
  @ApiPropertyOptional({ enum: XiaolongxiaConversionType })
  @IsOptional()
  @IsEnum(XiaolongxiaConversionType)
  conversionType?: XiaolongxiaConversionType;

  @ApiPropertyOptional({ enum: XiaolongxiaPromoterType })
  @IsOptional()
  @IsEnum(XiaolongxiaPromoterType)
  promoterType?: XiaolongxiaPromoterType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promoterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gameCode?: string;

  @ApiPropertyOptional({ enum: XiaolongxiaChannel })
  @IsOptional()
  @IsEnum(XiaolongxiaChannel)
  channel?: XiaolongxiaChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statDateTo?: string;
}
