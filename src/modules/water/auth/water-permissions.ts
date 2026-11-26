import { WaterRole } from '../common/water.enums';

export const WATER_TRIAL_ROLES = [
  WaterRole.Owner,
  WaterRole.Admin,
  WaterRole.HqOperations,
  WaterRole.CustomerService,
  WaterRole.Finance,
] as const;

export const WATER_ROLE_PERMISSION_MATRIX: Record<WaterRole, string[]> = {
  [WaterRole.Owner]: ['*'],
  [WaterRole.Admin]: [
    'water.admin.read',
    'water.admin.write',
    'water.phone.reveal',
    'water.audit.read',
    'water.backup.prepare',
  ],
  [WaterRole.HqOperations]: ['water.admin.read', 'water.admin.write', 'water.phone.reveal', 'water.audit.read'],
  [WaterRole.CustomerService]: ['water.admin.read', 'water.order.write', 'water.phone.reveal'],
  [WaterRole.Finance]: ['water.admin.read', 'water.ticket.read', 'water.audit.read'],
  [WaterRole.Agent]: ['water.agent.read'],
  [WaterRole.ServicePoint]: ['water.service_point.read'],
  [WaterRole.DeliveryStaff]: ['water.delivery.read'],
  [WaterRole.AiAssistant]: ['water.analytics.read'],
};

export function hasWaterPermission(role: WaterRole | string | undefined, permission: string): boolean {
  if (!role || !(role in WATER_ROLE_PERMISSION_MATRIX)) return false;
  const permissions = WATER_ROLE_PERMISSION_MATRIX[role as WaterRole];
  return permissions.includes('*') || permissions.includes(permission);
}

export function canRevealCustomerPhone(role: WaterRole | string | undefined): boolean {
  return hasWaterPermission(role, 'water.phone.reveal');
}
