<template>
  <main class="login-page">
    <section class="login-panel">
      <div>
        <p class="eyebrow">{{ zhCN.login.eyebrow }}</p>
        <h1>{{ zhCN.login.title }}</h1>
        <p class="subtitle">{{ zhCN.login.subtitle }}</p>
      </div>
      <ErrorAlert :code="errorCode" :message="errorMessage" @clear="clearError" />
      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item :label="zhCN.login.username">
          <el-input v-model="form.username" autocomplete="username" :placeholder="zhCN.login.usernamePlaceholder" />
        </el-form-item>
        <el-form-item :label="zhCN.login.password">
          <el-input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            show-password
            :placeholder="zhCN.login.passwordPlaceholder"
          />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading" class="login-button">
          {{ zhCN.login.submit }}
        </el-button>
      </el-form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ErrorAlert from '@/components/ErrorAlert.vue';
import { authApi } from '@/api/auth';
import { normalizeApiError } from '@/api/http';
import { zhCN } from '@/i18n/zhCN';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const errorCode = ref('');
const errorMessage = ref('');
const form = reactive({
  username: '',
  password: '',
});

function clearError() {
  errorCode.value = '';
  errorMessage.value = '';
}

async function submit() {
  loading.value = true;
  clearError();
  try {
    await authApi.login(form.username, form.password);
    await router.replace(String(route.query.redirect || '/dashboard'));
  } catch (error) {
    const apiError = normalizeApiError(error);
    errorCode.value = apiError.code;
    errorMessage.value = apiError.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background: #eef3f7;
}

.login-panel {
  width: min(420px, 100%);
  padding: 28px;
  border: 1px solid #dce3ec;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 20px 55px rgb(17 24 39 / 10%);
}

.eyebrow {
  margin: 0 0 6px;
  color: #147c76;
  font-size: 13px;
  font-weight: 700;
}

h1 {
  margin: 0;
  color: #111827;
  font-size: 24px;
}

.subtitle {
  margin: 6px 0 22px;
  color: #667085;
  font-size: 14px;
}

.login-button {
  width: 100%;
}
</style>
