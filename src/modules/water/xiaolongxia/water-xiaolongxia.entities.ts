import { WaterXiaolongxiaGameAttributionEntity } from './water-xiaolongxia-game-attribution.entity';
import { WaterXiaolongxiaGameSourceStatEntity } from './water-xiaolongxia-game-source-stat.entity';
import { WaterXiaolongxiaKnowledgeEntryEntity } from './water-xiaolongxia-knowledge-entry.entity';
import { WaterXiaolongxiaPromotionRecordEntity } from './water-xiaolongxia-promotion-record.entity';
import { WaterXiaolongxiaRewardRuleEntity } from './water-xiaolongxia-reward-rule.entity';

/**
 * V1 design-stage entity list.
 *
 * IMPORTANT: do NOT add these entities to src/modules/water/water.entities.ts
 * or src/database/data-source.ts until the design is reviewed, approved, and a
 * dedicated migration is written and verified. Keeping them unregistered
 * guarantees zero production schema impact from this skeleton round.
 */
export const waterXiaolongxiaEntities = [
  WaterXiaolongxiaKnowledgeEntryEntity,
  WaterXiaolongxiaPromotionRecordEntity,
  WaterXiaolongxiaRewardRuleEntity,
  WaterXiaolongxiaGameSourceStatEntity,
  WaterXiaolongxiaGameAttributionEntity,
];

export {
  WaterXiaolongxiaKnowledgeEntryEntity,
  WaterXiaolongxiaPromotionRecordEntity,
  WaterXiaolongxiaRewardRuleEntity,
  WaterXiaolongxiaGameSourceStatEntity,
  WaterXiaolongxiaGameAttributionEntity,
};
