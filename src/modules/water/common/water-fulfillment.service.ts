import { Injectable } from '@nestjs/common';
import { CreateAddressDto } from '../addresses/dto/create-address.dto';
import { BarrelsService } from '../barrels/barrels.service';
import { CreateCustomerDto } from '../customers/dto/create-customer.dto';
import { CustomersService } from '../customers/customers.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { DeliverOrderDto } from '../orders/dto/deliver-order.dto';
import { OrdersService } from '../orders/orders.service';
import { SellTicketDto } from '../tickets/dto/ticket-action.dto';
import { TicketsService } from '../tickets/tickets.service';
import { WaterErrorCode, waterConflict } from './water-api-error';
import { WaterBarrelStatus, WaterInventoryMovementType, WaterOrderStatus } from './water.enums';
import { WaterTransactionService } from './water-transaction.service';

@Injectable()
export class WaterFulfillmentService {
  constructor(
    private readonly transactions: WaterTransactionService,
    private readonly customers: CustomersService,
    private readonly orders: OrdersService,
    private readonly tickets: TicketsService,
    private readonly inventory: InventoryService,
    private readonly barrels: BarrelsService,
  ) {}

  async deliverOrderWithSettlement(orderId: string, dto: DeliverOrderDto) {
    return this.transactions.run(async () => {
      const orderBefore = this.orders.getRaw(orderId);
      if (orderBefore.order_status === WaterOrderStatus.Delivered) {
        return {
          order: orderBefore,
          ticketResult: null,
          inventoryMovement: null,
          barrelMovement: null,
        };
      }

      if (orderBefore.order_status === WaterOrderStatus.Cancelled) {
        throw waterConflict(WaterErrorCode.OrderInvalidStatus, 'cancelled order cannot be delivered', {
          order_id: orderId,
          order_status: orderBefore.order_status,
        });
      }

      const order = this.orders.deliverOrder(orderId, dto);
      const ticketQuantity = Number(dto.ticket_quantity ?? orderBefore.ticket_quantity_to_use ?? 0);
      const inventoryQuantity = Number(dto.inventory_quantity ?? (ticketQuantity || 1));
      const idempotencyPrefix = dto.idempotency_key ?? `deliver:${orderId}`;

      const ticketResult =
        ticketQuantity > 0
          ? this.tickets.useTicket({
              customer_id: String(orderBefore.customer_id),
              ticket_id: dto.ticket_id,
              quantity: ticketQuantity,
              related_order_id: orderId,
              created_by: dto.updated_by,
              actor_role: dto.actor_role,
              idempotency_key: `${idempotencyPrefix}:ticket-use`,
            })
          : null;

      const inventoryMovement =
        inventoryQuantity > 0
          ? this.inventory.consumeForDelivery({
              agent_id: String(orderBefore.agent_id ?? ''),
              service_point_id: String(orderBefore.service_point_id ?? ''),
              quantity: inventoryQuantity,
              related_order_id: orderId,
              created_by: dto.updated_by,
              actor_role: dto.actor_role,
              idempotency_key: `${idempotencyPrefix}:inventory-delivery-out`,
              reason: dto.reason ?? 'delivery_completed',
            })
          : null;

      const barrelMovement = dto.barrel_id
        ? this.barrels.returnBarrel({
            barrelId: dto.barrel_id,
            toHolderType: dto.return_to_holder_type ?? (orderBefore.service_point_id ? 'SERVICE_POINT' : 'AGENT'),
            toHolderId: dto.return_to_holder_id ?? String(orderBefore.service_point_id ?? orderBefore.agent_id ?? ''),
            actorId: dto.updated_by,
            actorRole: dto.actor_role,
            idempotencyKey: `${idempotencyPrefix}:barrel-return`,
            reason: dto.reason ?? 'empty_barrel_returned',
          })
        : null;

      return {
        order,
        ticketResult,
        inventoryMovement,
        barrelMovement,
      };
    });
  }
}
