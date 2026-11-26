import { createRouter, createWebHistory } from 'vue-router';
import AdminLayout from '@/layouts/AdminLayout.vue';
import LoginPage from '@/pages/LoginPage.vue';
import DashboardPage from '@/pages/DashboardPage.vue';
import TrialWizardPage from '@/pages/TrialWizardPage.vue';
import CustomersPage from '@/pages/CustomersPage.vue';
import OrdersPage from '@/pages/OrdersPage.vue';
import TicketsPage from '@/pages/TicketsPage.vue';
import InventoryPage from '@/pages/InventoryPage.vue';
import BarrelsPage from '@/pages/BarrelsPage.vue';
import EventsPage from '@/pages/EventsPage.vue';
import AuditLogsPage from '@/pages/AuditLogsPage.vue';
import { getAuthToken } from '@/api/session';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginPage, meta: { public: true } },
    {
      path: '/',
      component: AdminLayout,
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', name: 'dashboard', component: DashboardPage },
        { path: 'trial-wizard', name: 'trial-wizard', component: TrialWizardPage },
        { path: 'customers', name: 'customers', component: CustomersPage },
        { path: 'orders', name: 'orders', component: OrdersPage },
        { path: 'tickets', name: 'tickets', component: TicketsPage },
        { path: 'inventory', name: 'inventory', component: InventoryPage },
        { path: 'barrels', name: 'barrels', component: BarrelsPage },
        { path: 'events', name: 'events', component: EventsPage },
        { path: 'audit-logs', name: 'audit-logs', component: AuditLogsPage },
      ],
    },
  ],
});

router.beforeEach((to) => {
  if (to.meta.public) return true;
  if (!getAuthToken()) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  return true;
});
