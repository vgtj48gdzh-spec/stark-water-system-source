import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { waterOk, waterPage } from '../common/water-api-response';
import {
  XiaolongxiaGameAttributionListQueryDto,
  XiaolongxiaGameSourceStatListQueryDto,
  XiaolongxiaKnowledgeListQueryDto,
  XiaolongxiaPromotionRecordListQueryDto,
  XiaolongxiaRewardRuleListQueryDto,
} from './dto/xiaolongxia-query.dto';
import { XiaolongxiaService } from './xiaolongxia.service';

/**
 * V1 read-only API draft for the Xiaolongxia water-business assistant.
 * Not registered in WaterModule yet; this is a compile-checked skeleton only.
 * No write endpoints exist in V1.
 */
@ApiTags('water-xiaolongxia')
@Controller('water/xiaolongxia')
export class XiaolongxiaController {
  constructor(private readonly xiaolongxia: XiaolongxiaService) {}

  @Get('design-summary')
  @ApiOperation({ summary: 'Xiaolongxia assistant V1 design summary (read-only draft skeleton).' })
  designSummary() {
    return waterOk(this.xiaolongxia.designSummary());
  }

  @Get('knowledge-entries')
  @ApiOperation({ summary: 'List assistant knowledge base entries (read-only draft; empty until wired).' })
  listKnowledgeEntries(@Query() query: XiaolongxiaKnowledgeListQueryDto) {
    return waterPage(this.xiaolongxia.listKnowledgeEntries(query));
  }

  @Get('promotion-records')
  @ApiOperation({ summary: 'List promotion records (read-only draft; empty until wired).' })
  listPromotionRecords(@Query() query: XiaolongxiaPromotionRecordListQueryDto) {
    return waterPage(this.xiaolongxia.listPromotionRecords(query));
  }

  @Get('reward-rules')
  @ApiOperation({ summary: 'List reward rules (read-only draft; empty until wired).' })
  listRewardRules(@Query() query: XiaolongxiaRewardRuleListQueryDto) {
    return waterPage(this.xiaolongxia.listRewardRules(query));
  }

  @Get('game-source-stats')
  @ApiOperation({ summary: 'List mini-game source stats (read-only draft; empty until wired).' })
  listGameSourceStats(@Query() query: XiaolongxiaGameSourceStatListQueryDto) {
    return waterPage(this.xiaolongxia.listGameSourceStats(query));
  }

  @Get('game-attributions')
  @ApiOperation({ summary: 'List mini-game conversion attributions (read-only draft; empty until wired).' })
  listGameAttributions(@Query() query: XiaolongxiaGameAttributionListQueryDto) {
    return waterPage(this.xiaolongxia.listGameAttributions(query));
  }
}
