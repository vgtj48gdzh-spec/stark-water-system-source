import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateAddressDto } from '../addresses/dto/create-address.dto';
import { filterRecords, paginateRecords, waterOk, waterPage } from '../common/water-api-response';
import { CustomerListQueryDto } from '../common/water-query.dto';
import { WaterRole } from '../common/water.enums';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { RevealCustomerPhoneDto } from './dto/reveal-phone.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';
import { WaterDbService } from '../common/water-db.service';
import { WaterRequestWithActor } from '../auth/water-auth.types';

@ApiTags('water-customers')
@Controller('water/customers')
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly db: WaterDbService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List water customers with V0 admin filters and pagination.' })
  async list(
    @Query() query: CustomerListQueryDto,
    @Query('viewer_role') viewerRole?: WaterRole,
    @Query('full_phone_grant') fullPhoneGrant?: string,
  ) {
    const dbRecords = await this.db.listCustomers(false);
    const records = dbRecords ?? (this.customers.list(viewerRole, false) as Record<string, unknown>[]);
    const filtered = this.db.maskCustomerRecords(filterRecords(records, query as Record<string, unknown>) as any[]);
    return waterPage(paginateRecords(filtered, query));
  }

  @Post()
  @ApiOperation({ summary: 'Create a water customer and emit customer-created event/audit log.' })
  async create(@Body() dto: CreateCustomerDto) {
    return waterOk((await this.db.createCustomer(dto)) ?? this.customers.create(dto));
  }

  @Get(':id')
  async get(
    @Param('id') id: string,
    @Query('viewer_role') viewerRole?: WaterRole,
    @Query('full_phone_grant') fullPhoneGrant?: string,
  ) {
    return waterOk((await this.db.getCustomer(id, true)) ?? this.customers.get(id, viewerRole, false));
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Get read-only V0 customer detail with addresses, orders, tickets, barrels, and audit logs.' })
  async detail(@Param('id') id: string) {
    return waterOk((await this.db.getCustomerDetail(id)) ?? this.customers.get(id, WaterRole.Admin, false));
  }

  @Get(':id/addresses')
  @ApiOperation({ summary: 'List one customer addresses with masked contact phones and delivery counters.' })
  async addresses(@Param('id') id: string) {
    return waterOk((await this.db.listCustomerAddresses(id)) ?? []);
  }

  @Post(':id/reveal-phone')
  @ApiOperation({ summary: 'Reveal one customer phone with reason and audit log. No bulk reveal/export.' })
  async revealPhone(
    @Param('id') id: string,
    @Body() dto: RevealCustomerPhoneDto,
    @Req() request: WaterRequestWithActor,
  ) {
    return waterOk(
      await this.db.revealCustomerPhone(id, {
        actor_id: request.waterActor?.actorId,
        actor_role: request.waterActor?.actorRole,
        reason: dto.reason,
      }),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a water customer profile with audit trail.' })
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return waterOk((await this.db.updateCustomer(id, dto)) ?? this.customers.update(id, dto));
  }

  @Post(':id/addresses')
  @ApiOperation({ summary: 'Create an address for a water customer.' })
  async createAddress(@Param('id') id: string, @Body() dto: CreateAddressDto) {
    return waterOk((await this.db.createAddress(id, dto)) ?? this.customers.createAddress(id, dto));
  }
}
