import { WaterRole } from './water.enums';

export interface PhoneVisibilityContext {
  role: WaterRole;
  hasExplicitGrant?: boolean;
  isDeliveryWindow?: boolean;
}

export function canViewFullPhone(context: PhoneVisibilityContext): boolean {
  if (context.role === WaterRole.Owner && context.hasExplicitGrant === true) {
    return true;
  }

  if ([WaterRole.Admin, WaterRole.Finance, WaterRole.CustomerService, WaterRole.HqOperations].includes(context.role)) {
    return context.hasExplicitGrant === true;
  }

  if (context.role === WaterRole.DeliveryStaff) {
    return context.isDeliveryWindow === true && context.hasExplicitGrant === true;
  }

  return false;
}

export function maskPhoneNumber(phone: string | null | undefined, context: PhoneVisibilityContext): string | null {
  if (!phone) {
    return null;
  }

  if (canViewFullPhone(context)) {
    return phone;
  }

  const normalized = phone.trim();
  if (normalized.length <= 7) {
    return `${normalized.slice(0, 2)}****`;
  }

  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '').replace(/^\+86/, '');
}
