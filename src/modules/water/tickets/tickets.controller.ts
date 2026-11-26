import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { filterRecords, paginateRecords, waterOk, waterPage } from '../common/water-api-response';
import { WaterDbService } from '../common/water-db.service';
import { TicketListQueryDto } from '../common/water-query.dto';
import { CancelTicketPurchaseDto, ConfirmTicketPaymentDto, RefundTicketDto, SellTicketDto, UseTicketDto } from './dto/ticket-action.dto';
import { TicketsService } from './tickets.service';

@ApiTags('water-tickets')
@Controller('water/tickets')
export class TicketsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly db: WaterDbService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List water ticket entitlement accounts.' })
  async list(@Query() query: TicketListQueryDto) {
    const dbTickets = await this.db.listTickets();
    const list = dbTickets ? { tickets: dbTickets, balances: dbTickets } : this.tickets.list();
    let records = filterRecords(list.tickets as Record<string, unknown>[], query as Record<string, unknown>);
    if (query.balanceGtZero) {
      const balances = new Map<string, number>(
        list.balances.map((balance: any) => [String(balance.ticket_id ?? balance.id), Number(balance.balance)] as [string, number]),
      );
      records = records.filter((ticket) => Number(balances.get(String(ticket.id))) > 0);
    }

    return waterPage(paginateRecords(records, query));
  }

  @Post('sell')
  @ApiOperation({ summary: 'Sell water tickets as prepaid entitlement with transaction ledger.' })
  async sell(@Body() dto: SellTicketDto) {
    return waterOk((await this.db.sellTicket(dto)) ?? this.tickets.sell(dto));
  }

  @Post('use')
  @ApiOperation({ summary: 'Use water ticket entitlement with balance protection and transaction ledger.' })
  async use(@Body() dto: UseTicketDto) {
    return waterOk((await this.db.useTicket(dto)) ?? this.tickets.use(dto));
  }

  @Post(':id/confirm-payment')
  @ApiOperation({ summary: 'Confirm offline payment and activate water ticket entitlement.' })
  async confirmPayment(@Param('id') id: string, @Body() dto: ConfirmTicketPaymentDto) {
    return waterOk(await this.db.confirmTicketPayment(id, dto));
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending water ticket purchase order before payment confirmation.' })
  async cancel(@Param('id') id: string, @Body() dto: CancelTicketPurchaseDto) {
    return waterOk(await this.db.cancelTicketPurchase(id, dto));
  }

  @Post('refund')
  @ApiOperation({ summary: 'Refund water ticket entitlement by writing refund transaction ledger.' })
  async refund(@Body() dto: RefundTicketDto) {
    return waterOk((await this.db.refundTicket(dto)) ?? this.tickets.refund(dto));
  }
}
