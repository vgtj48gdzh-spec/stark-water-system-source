import { HttpException, HttpStatus } from '@nestjs/common';
import { waterError } from './water-api-response';

export enum WaterErrorCode {
  CustomerNotFound = 'WATER_CUSTOMER_NOT_FOUND',
  CustomerPhoneExists = 'WATER_CUSTOMER_PHONE_EXISTS',
  AddressNotFound = 'WATER_ADDRESS_NOT_FOUND',
  AgentNotFound = 'WATER_AGENT_NOT_FOUND',
  ServicePointNotFound = 'WATER_SERVICE_POINT_NOT_FOUND',
  OrderNotFound = 'WATER_ORDER_NOT_FOUND',
  TicketNotFound = 'WATER_TICKET_NOT_FOUND',
  TicketInsufficientBalance = 'WATER_TICKET_INSUFFICIENT_BALANCE',
  InventoryInsufficient = 'WATER_INVENTORY_INSUFFICIENT',
  BarrelNotFound = 'WATER_BARREL_NOT_FOUND',
  BarrelInvalidState = 'WATER_BARREL_INVALID_STATE',
  OrderInvalidStatus = 'WATER_ORDER_INVALID_STATUS',
  PaymentStatusInvalid = 'WATER_PAYMENT_STATUS_INVALID',
  IdempotencyKeyRequired = 'WATER_IDEMPOTENCY_KEY_REQUIRED',
  IdempotencyConflict = 'WATER_IDEMPOTENCY_CONFLICT',
  PermissionDenied = 'WATER_PERMISSION_DENIED',
  ValidationFailed = 'WATER_VALIDATION_FAILED',
  InternalError = 'WATER_INTERNAL_ERROR',
}

export class WaterApiException extends HttpException {
  constructor(
    status: HttpStatus,
    code: WaterErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(waterError(code, message, details), status);
  }
}

export function waterBadRequest(
  code: WaterErrorCode,
  message: string,
  details?: Record<string, unknown>,
): WaterApiException {
  return new WaterApiException(HttpStatus.BAD_REQUEST, code, message, details);
}

export function waterConflict(
  code: WaterErrorCode,
  message: string,
  details?: Record<string, unknown>,
): WaterApiException {
  return new WaterApiException(HttpStatus.CONFLICT, code, message, details);
}

export function waterNotFound(
  code: WaterErrorCode,
  message: string,
  details?: Record<string, unknown>,
): WaterApiException {
  return new WaterApiException(HttpStatus.NOT_FOUND, code, message, details);
}

export function waterUnauthorized(
  code: WaterErrorCode,
  message: string,
  details?: Record<string, unknown>,
): WaterApiException {
  return new WaterApiException(HttpStatus.UNAUTHORIZED, code, message, details);
}

export function waterForbidden(
  code: WaterErrorCode,
  message: string,
  details?: Record<string, unknown>,
): WaterApiException {
  return new WaterApiException(HttpStatus.FORBIDDEN, code, message, details);
}

export function requireIdempotencyKey(idempotencyKey: string | null | undefined): void {
  if (!idempotencyKey) {
    throw waterBadRequest(
      WaterErrorCode.IdempotencyKeyRequired,
      'idempotency_key is required for this water operation',
    );
  }
}
