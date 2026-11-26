<template>
  <el-container class="admin-shell">
    <el-aside class="sidebar" width="236px">
      <div class="brand">
        <div class="brand-mark">{{ zhCN.appMark }}</div>
        <div>
          <strong>{{ zhCN.appName }}</strong>
          <span>{{ zhCN.versionLabel }}</span>
        </div>
      </div>
      <el-menu router :default-active="activePath" class="nav-menu">
        <el-menu-item v-for="item in navItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="topbar">
        <div>
          <span class="muted">{{ zhCN.apiLabel }}</span>
          <span class="mono">{{ apiBaseUrl }}</span>
        </div>
        <div class="topbar-actions">
          <span class="muted">{{ zhCN.role }}</span>
          <el-tag type="success" effect="plain">{{ roleLabel(currentUser?.role || 'ADMIN') }}</el-tag>
          <span class="muted">{{ zhCN.currentUser }}</span>
          <span class="username">{{ currentUser?.username || 'water-admin' }}</span>
          <el-button size="small" @click="logout">{{ zhCN.logout }}</el-button>
        </div>
      </el-header>
      <el-main class="main-panel">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '@/api/auth';
import { getStoredUser } from '@/api/session';
import { zhCN } from '@/i18n/zhCN';
import { roleLabel } from '@/utils/statusLabels';

const route = useRoute();
const router = useRouter();
const apiBaseUrl = import.meta.env.VITE_WATER_API_BASE_URL || 'http://127.0.0.1:3001';
const activePath = computed(() => route.path);
const currentUser = computed(() => getStoredUser());

const navItems = zhCN.nav;

async function logout() {
  await authApi.logout();
  await router.replace('/login');
}
</script>

<style scoped>
.admin-shell {
  min-height: 100vh;
}

.sidebar {
  border-right: 1px solid #d9e0ea;
  background: #101827;
}

.brand {
  display: flex;
  gap: 10px;
  align-items: center;
  height: 64px;
  padding: 0 18px;
  color: #fff;
}

.brand-mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 8px;
  background: #12a59c;
  font-weight: 800;
}

.brand strong,
.brand span {
  display: block;
}

.brand span {
  margin-top: 3px;
  color: #a7b2c3;
  font-size: 12px;
}

.nav-menu {
  border-right: 0;
  background: transparent;
}

:deep(.el-menu-item) {
  color: #b9c3d4;
}

:deep(.el-menu-item.is-active),
:deep(.el-menu-item:hover) {
  background: #1d2a3d;
  color: #fff;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #dfe5ef;
  background: #fff;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.username {
  color: #334155;
  font-size: 13px;
}

.main-panel {
  min-width: 0;
  padding: 20px;
}
</style>
