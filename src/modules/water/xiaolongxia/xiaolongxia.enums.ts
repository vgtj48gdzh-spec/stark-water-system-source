// Xiaolongxia water-business assistant V1 design-stage enums.
// DRAFT: not wired into runtime modules yet.

export enum XiaolongxiaKnowledgeStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  Archived = 'ARCHIVED',
}

export enum XiaolongxiaKnowledgeCategory {
  ProductFaq = 'PRODUCT_FAQ',
  DeliveryFaq = 'DELIVERY_FAQ',
  TicketGuide = 'TICKET_GUIDE',
  DepositGuide = 'DEPOSIT_GUIDE',
  PromotionCopy = 'PROMOTION_COPY',
  GameGuide = 'GAME_GUIDE',
  Other = 'OTHER',
}

export enum XiaolongxiaPromoterType {
  Customer = 'CUSTOMER',
  Agent = 'AGENT',
  ServicePoint = 'SERVICE_POINT',
  Staff = 'STAFF',
  Other = 'OTHER',
}

export enum XiaolongxiaChannel {
  WechatSession = 'WECHAT_SESSION',
  WechatMoments = 'WECHAT_MOMENTS',
  CommunityGroup = 'COMMUNITY_GROUP',
  OfflinePoster = 'OFFLINE_POSTER',
  MiniGameShare = 'MINI_GAME_SHARE',
  Other = 'OTHER',
}

export enum XiaolongxiaRewardTrigger {
  GameShare = 'GAME_SHARE',
  GameScoreMilestone = 'GAME_SCORE_MILESTONE',
  InviteFriend = 'INVITE_FRIEND',
  DailyCheckIn = 'DAILY_CHECK_IN',
  QuizAnswer = 'QUIZ_ANSWER',
}

export enum XiaolongxiaRewardType {
  // V1 allows points only. Rewards must never create water tickets, balances,
  // order amounts, deposit changes, or payment side effects.
  Points = 'POINTS',
}

export enum XiaolongxiaRewardRuleStatus {
  Draft = 'DRAFT',
  Active = 'ACTIVE',
  Paused = 'PAUSED',
  Archived = 'ARCHIVED',
}

// Conversion / attribution event types for mini-game source tracking.
// These are read-only attribution references; they never mutate the referenced
// customer, order, ticket, or service-code records.
export enum XiaolongxiaConversionType {
  // A visitor bound a customer identity after arriving from a game source.
  CustomerBound = 'CUSTOMER_BOUND',
  // An order was created that can be attributed to a game source.
  OrderCreated = 'ORDER_CREATED',
  // A water-ticket purchase can be attributed to a game source.
  TicketPurchased = 'TICKET_PURCHASED',
  // A family service code (V2.1 reserved) was bound through a game source.
  ServiceCodeBound = 'SERVICE_CODE_BOUND',
}
