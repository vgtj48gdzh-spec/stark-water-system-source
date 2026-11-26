<template>
  <section class="trial-wizard-page">
    <PageHeader title="第一批 3 单受控试单向导" subtitle="帮助本地操作者按 T001 / T002 / T003 完成真实后台试单。">
      <el-button type="primary" plain @click="go('/customers')">去客户管理</el-button>
      <el-button type="success" plain @click="go('/orders')">去订单管理</el-button>
    </PageHeader>

    <el-alert
      class="privacy-alert"
      type="warning"
      show-icon
      :closable="false"
      title="真实客户只能通过本地后台录入，不要把真实客户信息写入文档、seed、GitHub 或聊天。不要使用 5173，水系统后台固定使用 5174。"
    />

    <div class="status-grid">
      <section class="status-panel">
        <div class="panel-title">当前试单阶段</div>
        <dl class="status-list">
          <div>
            <dt>当前阶段</dt>
            <dd>V0 内部后台受控试单</dd>
          </div>
          <div>
            <dt>试单范围</dt>
            <dd>T001 / T002 / T003</dd>
          </div>
          <div>
            <dt>真实客户</dt>
            <dd>仅通过本地后台录入</dd>
          </div>
          <div>
            <dt>禁止</dt>
            <dd>不要把真实客户信息写入文档、seed、GitHub 或聊天</dd>
          </div>
        </dl>
      </section>

      <section class="status-panel">
        <div class="panel-title">试单前门禁</div>
        <div class="gate-list">
          <div v-for="gate in gates" :key="gate.label" class="gate-row">
            <el-tag :type="gate.type" effect="plain">{{ gate.status }}</el-tag>
            <span>{{ gate.label }}</span>
            <strong>{{ gate.value }}</strong>
          </div>
        </div>
        <p class="panel-hint">如最近备份或 readiness 状态不确定，先在终端执行门禁命令，再开始真实客户录入。</p>
      </section>
    </div>

    <div class="trial-layout">
      <section v-for="trial in trials" :key="trial.id" class="trial-panel">
        <div class="trial-header">
          <div>
            <p class="trial-id">{{ trial.id }}</p>
            <h2>{{ trial.title }}</h2>
          </div>
          <el-tag :type="trial.tagType" effect="dark">{{ trial.tag }}</el-tag>
        </div>

        <div class="purpose-block">
          <strong>目的：</strong>
          <span>{{ trial.purpose }}</span>
        </div>

        <ol class="step-list">
          <li v-for="step in trial.steps" :key="step">{{ step }}</li>
        </ol>

        <el-alert
          v-if="trial.notice"
          class="trial-notice"
          :type="trial.noticeType"
          show-icon
          :closable="false"
          :title="trial.notice"
        />

        <div class="action-row">
          <el-button v-for="action in trial.actions" :key="action.path" size="small" @click="go(action.path)">
            {{ action.label }}
          </el-button>
        </div>

        <div class="check-section">
          <div class="check-title">本地勾选进度</div>
          <el-checkbox
            v-for="item in trial.checks"
            :key="item.id"
            v-model="checkState[item.id]"
            class="check-item"
            @change="saveChecks"
          >
            {{ item.label }}
          </el-checkbox>
        </div>
      </section>
    </div>

    <section class="verify-panel">
      <div class="trial-header">
        <div>
          <p class="trial-id">试单后核验</p>
          <h2>三单完成后逐项核对</h2>
        </div>
        <el-tag effect="plain">人工核验</el-tag>
      </div>

      <div class="verify-grid">
        <el-checkbox
          v-for="item in finalChecks"
          :key="item.id"
          v-model="checkState[item.id]"
          class="check-item"
          @change="saveChecks"
        >
          {{ item.label }}
        </el-checkbox>
      </div>

      <div class="action-row">
        <el-button v-for="action in finalActions" :key="action.path" @click="go(action.path)">
          {{ action.label }}
        </el-button>
      </div>

      <div class="explain-grid">
        <section class="explain-card">
          <h3>库存流水核对说明</h3>
          <p>试单配送完成后，库存管理里的流水应显示“配送出库”，数量为 1 桶，来源为服务点库存，去向为客户订单。</p>
          <p>T001 / T002 / T003 三单都完成后，库存应累计减少 3 桶；如果只看到数量 1，这是单笔订单的出库动作，不是错误。</p>
        </section>
        <section class="explain-card">
          <h3>业务事件核对说明</h3>
          <p>事件队列用于未来总公司接入。当前“待同步”属于正常状态，不代表本地业务失败。</p>
          <p>每单应能看到订单创建、订单配送完成、库存流水、桶流转等业务事件；水票单还应看到水票销售和水票核销事件。</p>
        </section>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';

type GateType = 'success' | 'warning' | 'info';
type NoticeType = 'success' | 'warning' | 'info' | 'error';

type WizardAction = {
  label: string;
  path: string;
};

type WizardCheck = {
  id: string;
  label: string;
};

type WizardTrial = {
  id: string;
  title: string;
  tag: string;
  tagType: 'success' | 'warning' | 'info' | 'primary';
  purpose: string;
  steps: string[];
  notice?: string;
  noticeType: NoticeType;
  actions: WizardAction[];
  checks: WizardCheck[];
};

const router = useRouter();
const storageKey = 'stark-water:v0-trial-wizard-checks';

const gates: Array<{ label: string; value: string; status: string; type: GateType }> = [
  { label: '后端', value: '127.0.0.1:3001', status: '已配置', type: 'success' },
  { label: '后台', value: '127.0.0.1:5174', status: '已配置', type: 'success' },
  { label: 'MySQL', value: '127.0.0.1:3308', status: '已配置', type: 'success' },
  { label: '最近备份', value: '先执行 npm run db:backup:water', status: '需确认', type: 'warning' },
  { label: 'readiness', value: '先执行 npm run self-check:water-trial-real-ready', status: '需确认', type: 'warning' },
];

const sharedActions: WizardAction[] = [
  { label: '去客户管理', path: '/customers' },
  { label: '去订单管理', path: '/orders' },
  { label: '去库存管理', path: '/inventory' },
  { label: '去桶资产管理', path: '/barrels' },
  { label: '去业务事件', path: '/events' },
  { label: '去操作审计', path: '/audit-logs' },
];

const trials: WizardTrial[] = [
  {
    id: 'T001',
    title: '散单 1 桶',
    tag: '不用水票',
    tagType: 'info',
    purpose: '验证散单订单不需要水票，也能完成配送、库存扣减、桶资产流转、事件和审计。',
    notice: 'T001 不用水票。配送完成弹窗应显示“本单为散单订单，无需核销水票”。',
    noticeType: 'info',
    steps: [
      '新建客户 A。',
      '新增地址，并在客户详情中确认能看到该地址。',
      '创建散单订单：1 桶，10 元，线下收款 / 人工确认。',
      '分配订单。',
      '配送完成。',
      '检查订单状态、库存、桶资产、业务事件、审计日志。',
    ],
    actions: sharedActions,
    checks: [
      { id: 't001-customer', label: '客户已建档' },
      { id: 't001-address', label: '地址已新增' },
      { id: 't001-order', label: '订单已创建' },
      { id: 't001-assigned', label: '订单已分配' },
      { id: 't001-delivered', label: '配送已完成' },
      { id: 't001-inventory', label: '库存已核对' },
      { id: 't001-barrel', label: '桶资产已核对' },
      { id: 't001-events', label: '事件已核对' },
      { id: 't001-audit', label: '审计已核对' },
    ],
  },
  {
    id: 'T002',
    title: '20 桶水票 + 核销 1 桶',
    tag: '余额应为 19',
    tagType: 'success',
    purpose: '验证水票权益账户、核销流水和余额变化。',
    notice: 'T002 完成后，水票余额必须是 19。',
    noticeType: 'success',
    steps: [
      '新建客户 B。',
      '新增地址。',
      '销售 20 桶水票，金额 180 元。',
      '创建使用水票的 1 桶订单。',
      '分配订单。',
      '配送完成并核销 1 桶。',
      '检查水票余额是否为 19。',
      '检查水票流水、库存、桶资产、事件、审计。',
    ],
    actions: [
      { label: '去客户管理', path: '/customers' },
      { label: '去水票管理', path: '/tickets' },
      { label: '去订单管理', path: '/orders' },
      { label: '去库存管理', path: '/inventory' },
      { label: '去桶资产管理', path: '/barrels' },
      { label: '去业务事件', path: '/events' },
      { label: '去操作审计', path: '/audit-logs' },
    ],
    checks: [
      { id: 't002-customer', label: '客户已建档' },
      { id: 't002-address', label: '地址已新增' },
      { id: 't002-ticket-sold', label: '20 桶水票已销售' },
      { id: 't002-order', label: '订单已创建' },
      { id: 't002-assigned', label: '订单已分配' },
      { id: 't002-delivered', label: '配送已完成' },
      { id: 't002-balance', label: '水票余额已核对为 19' },
      { id: 't002-ledger', label: '水票流水已核对' },
      { id: 't002-audit', label: '事件和审计已核对' },
    ],
  },
  {
    id: 'T003',
    title: '商铺客户 1 桶或 10 桶票',
    tag: 'reveal 必须留痕',
    tagType: 'warning',
    purpose: '验证商铺客户、多地址和手机号 reveal 审计。',
    notice: '查看完整手机号必须填写原因，系统会写入操作审计。建议原因：试单配送联系客户。',
    noticeType: 'warning',
    steps: [
      '新建客户 C，备注或类型标记为商铺客户。',
      '新增地址，并在客户详情中查看该地址。',
      '如需联系客户，点击查看完整手机号，并填写原因：试单配送联系客户。',
      '创建散单 1 桶，或销售 10 桶票后核销 1 桶。',
      '分配订单。',
      '配送完成。',
      '检查手机号 reveal 审计、订单、库存、桶资产、事件、审计。',
    ],
    actions: sharedActions,
    checks: [
      { id: 't003-customer', label: '客户已建档并标记商铺客户' },
      { id: 't003-address', label: '地址已新增' },
      { id: 't003-reveal', label: '手机号 reveal 已填写原因' },
      { id: 't003-order', label: '订单或 10 桶票已创建' },
      { id: 't003-assigned', label: '订单已分配' },
      { id: 't003-delivered', label: '配送已完成' },
      { id: 't003-inventory', label: '库存已核对' },
      { id: 't003-barrel', label: '桶资产已核对' },
      { id: 't003-audit', label: '事件和审计已核对' },
    ],
  },
];

const finalChecks: WizardCheck[] = [
  { id: 'final-orders', label: '三单是否都完成配送？' },
  { id: 'final-t002-ticket', label: 'T002 水票余额是否为 19？' },
  { id: 'final-inventory', label: '库存是否减少 3？' },
  { id: 'final-barrel', label: '桶资产是否有 3 次流转？' },
  { id: 'final-events', label: '业务事件是否完整？' },
  { id: 'final-audit', label: '操作审计是否完整？' },
  { id: 'final-phone-reveal', label: '手机号 reveal 是否有 reason？' },
  { id: 'final-page-errors', label: '是否有页面报错？' },
  { id: 'final-api-errors', label: '是否有接口报错？' },
];

const finalActions: WizardAction[] = [
  { label: '去订单管理核对', path: '/orders' },
  { label: '去水票管理核对', path: '/tickets' },
  { label: '去库存管理核对', path: '/inventory' },
  { label: '去桶资产管理核对', path: '/barrels' },
  { label: '去业务事件核对', path: '/events' },
  { label: '去操作审计核对', path: '/audit-logs' },
];

const checkState = reactive<Record<string, boolean>>(loadChecks());

function loadChecks(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveChecks() {
  window.localStorage.setItem(storageKey, JSON.stringify(checkState));
}

function go(path: string) {
  router.push(path);
}
</script>

<style scoped>
.trial-wizard-page {
  display: grid;
  gap: 16px;
}

.privacy-alert {
  border-radius: 8px;
}

.status-grid,
.trial-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.status-panel,
.trial-panel,
.verify-panel {
  border: 1px solid #dfe5ef;
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.panel-title,
.check-title {
  color: #0f172a;
  font-weight: 700;
}

.status-list {
  display: grid;
  gap: 10px;
  margin: 12px 0 0;
}

.status-list div {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 12px;
}

.status-list dt {
  color: #64748b;
}

.status-list dd {
  margin: 0;
  color: #1f2937;
}

.gate-list {
  display: grid;
  gap: 9px;
  margin-top: 12px;
}

.gate-row {
  display: grid;
  grid-template-columns: 72px 88px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.gate-row span {
  color: #475569;
}

.gate-row strong {
  color: #111827;
  font-weight: 600;
}

.panel-hint {
  margin: 12px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.trial-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.trial-id {
  margin: 0 0 4px;
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
}

h2 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
  line-height: 1.35;
}

.purpose-block {
  display: flex;
  gap: 6px;
  color: #334155;
  line-height: 1.7;
}

.step-list {
  margin: 12px 0;
  padding-left: 22px;
  color: #334155;
  line-height: 1.8;
}

.trial-notice {
  margin-bottom: 12px;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}

.check-section {
  border-top: 1px solid #edf1f7;
  padding-top: 12px;
}

.check-item {
  display: block;
  margin: 8px 0 0;
  color: #334155;
}

.verify-panel {
  display: grid;
  gap: 10px;
}

.verify-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px 16px;
}

.explain-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.explain-card {
  border: 1px solid #dbe5f1;
  border-radius: 8px;
  background: #f8fafc;
  padding: 14px;
}

.explain-card h3 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 15px;
}

.explain-card p {
  margin: 6px 0 0;
  color: #475569;
  line-height: 1.7;
}

@media (max-width: 1100px) {
  .status-grid,
  .trial-layout,
  .verify-grid,
  .explain-grid {
    grid-template-columns: 1fr;
  }

  .gate-row {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .gate-row strong {
    grid-column: 2;
  }
}
</style>
