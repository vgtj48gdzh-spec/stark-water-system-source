import { requestData } from './http';
import type { AuthUser, LoginResult } from './types';
import { clearAuthSession, setAuthSession } from './session';

export const authApi = {
  async login(username: string, password: string): Promise<LoginResult> {
    const result = await requestData<LoginResult>({
      method: 'POST',
      url: '/api/water/auth/login',
      data: { username, password },
    });
    setAuthSession(result);
    return result;
  },

  me(): Promise<AuthUser> {
    return requestData<AuthUser>({ method: 'GET', url: '/api/water/auth/me' });
  },

  async logout(): Promise<void> {
    try {
      await requestData<{ logged_out: boolean }>({ method: 'POST', url: '/api/water/auth/logout', data: {} });
    } finally {
      clearAuthSession();
    }
  },
};
