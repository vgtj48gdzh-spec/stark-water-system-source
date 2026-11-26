import type { AuthUser, LoginResult } from './types';

const TOKEN_KEY = 'stark_water_admin_token';
const USER_KEY = 'stark_water_admin_user';

export function getAuthToken(): string {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function setAuthSession(result: LoginResult): void {
  localStorage.setItem(TOKEN_KEY, result.token);
  localStorage.setItem(USER_KEY, JSON.stringify(result.user));
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
