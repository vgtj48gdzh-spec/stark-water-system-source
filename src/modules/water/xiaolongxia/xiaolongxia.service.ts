import { Injectable } from '@nestjs/common';
import { paginateRecords, WaterPaginatedResult } from '../common/water-api-response';
import {
  XiaolongxiaGameAttributionListQueryDto,
  XiaolongxiaGameSourceStatListQueryDto,
  XiaolongxiaKnowledgeListQueryDto,
  XiaolongxiaPromotionRecordListQueryDto,
  XiaolongxiaRewardRuleListQueryDto,
} from './dto/xiaolongxia-query.dto';

export const XIAOLONGXIA_SKELETON_STAGE = 'V1_DESIGN_SKELETON_READONLY';

export const XIAOLONGXIA_BOUNDARIES = [
  'no-business-writes',
  'no-wechat-pay-changes',
  'no-order-amount-changes',
  'no-ticket-balance-changes',
  'no-deposit-refund-changes',
  'no-production-config-changes',
  'points-only-rewards',
  'attribution-references-are-read-only',
  'no-real-customer-privacy-in-knowledge-base',
  'published-business-rules-only',
  'no-price-or-policy-inference',
  'role-scoped-access-before-runtime',
  'unique-idempotency-required-before-writes',
  'immutable-audit-required-before-writes',
  'human-approval-required-for-writes',
] as const;

/**
 * Xiaolongxia water-business assistant V1 read-only skeleton.
 *
 * This service intentionally has NO database dependency and performs NO writes.
 * It is not registered in WaterModule yet; registration, WaterDbService wiring,
 * and a dedicated migration require owner review and approval first.
 */
@Injectable()
export class XiaolongxiaService {
  designSummary() {
    return {
      stage: XIAOLONGXIA_SKELETON_STAGE,
      readOnly: true,
      wiredIntoRuntime: false,
      tables: [
        'water_xiaolongxia_knowledge_entries',
        'water_xiaolongxia_promotion_records',
        'water_xiaolongxia_reward_rules',
        'water_xiaolongxia_game_source_stats',
        'water_xiaolongxia_game_attributions',
      ],
      endpoints: [
        'GET /api/water/xiaolongxia/design-summary',
        'GET /api/water/xiaolongxia/knowledge-entries',
        'GET /api/water/xiaolongxia/promotion-records',
        'GET /api/water/xiaolongxia/reward-rules',
        'GET /api/water/xiaolongxia/game-source-stats',
        'GET /api/water/xiaolongxia/game-attributions',
      ],
      boundaries: [...XIAOLONGXIA_BOUNDARIES],
      nextStep:
        'owner review -> migration -> role-scoped db-backed reads -> published business-rule resolver -> runtime registration',
    };
  }

  listKnowledgeEntries(query: XiaolongxiaKnowledgeListQueryDto): WaterPaginatedResult<Record<string, unknown>> {
    // Skeleton: returns an empty page until WaterDbService wiring is approved.
    return paginateRecords([], query);
  }

  listPromotionRecords(query: XiaolongxiaPromotionRecordListQueryDto): WaterPaginatedResult<Record<string, unknown>> {
    return paginateRecords([], query);
  }

  listRewardRules(query: XiaolongxiaRewardRuleListQueryDto): WaterPaginatedResult<Record<string, unknown>> {
    return paginateRecords([], query);
  }

  listGameSourceStats(query: XiaolongxiaGameSourceStatListQueryDto): WaterPaginatedResult<Record<string, unknown>> {
    return paginateRecords([], query);
  }

  listGameAttributions(query: XiaolongxiaGameAttributionListQueryDto): WaterPaginatedResult<Record<string, unknown>> {
    return paginateRecords([], query);
  }
}
