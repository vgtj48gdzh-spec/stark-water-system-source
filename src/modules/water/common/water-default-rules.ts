export const WATER_DEFAULT_RULES = {
  customerPrices: [
    { name: 'single_barrel', label: '散单', amountCny: 10, unit: '桶' },
    { name: 'ticket_10', label: '10 桶票', amountCny: 95, quantity: 10 },
    { name: 'ticket_20', label: '20 桶票', amountCny: 180, quantity: 20 },
    { name: 'ticket_50', label: '50 桶票', amountCny: 425, quantity: 50 },
    { name: 'tender_customer', label: '招投标客户', amountCny: null },
  ],
  agentPrices: [
    { name: 'agent_pickup', label: '代理自提价', amountCny: 4.5, unit: '桶' },
    { name: 'hq_to_agent_warehouse', label: '总部送到代理仓价', amountCny: 4.8, unit: '桶' },
    { name: 'small_batch_supply', label: '小批量供货价', amountCny: 5, unit: '桶' },
    { name: 'monthly_2000_plus', label: '月销 2000 桶以上', amountCny: 4.6, unit: '桶' },
    { name: 'monthly_5000_plus', label: '月销 5000 桶以上', amountCnyRange: [4.4, 4.5], unit: '桶' },
  ],
  deposits: [
    { name: 'customer_barrel', label: '桶押金', amountCny: 40, unit: '只' },
    { name: 'pilot_agent', label: '试点一级代理保证金', minAmountCny: 5000 },
    { name: 'standard_agent', label: '标准一级代理保证金', minAmountCny: 10000 },
    { name: 'service_point', label: '二级服务点保证金', minAmountCny: 1000, maxAmountCny: 5000 },
  ],
  penalties: [
    { phase: 'pilot', formula: '未达标桶数 x 1.5 元 / 桶' },
    { phase: 'formal', formula: '未达标桶数 x 2 元 / 桶' },
    { phase: 'monthly_cap', formula: '不超过履约保证金 20%' },
  ],
} as const;
