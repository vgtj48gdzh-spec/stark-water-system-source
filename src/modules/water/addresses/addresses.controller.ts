import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WaterRequestWithActor } from '../auth/water-auth.types';
import { waterOk } from '../common/water-api-response';
import { WaterDbService } from '../common/water-db.service';
import { RevealCustomerPhoneDto } from '../customers/dto/reveal-phone.dto';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('water-addresses')
@Controller('water/addresses')
export class AddressesController {
  constructor(
    private readonly addresses: AddressesService,
    private readonly db: WaterDbService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List water customer addresses.' })
  async list() {
    return waterOk((await this.db.listAddresses()) ?? this.addresses.list());
  }

  @Post()
  @ApiOperation({ summary: 'Create water customer address.' })
  async create(@Body() dto: CreateAddressDto) {
    return waterOk((await this.db.createAddress(dto.customer_id, dto)) ?? this.addresses.create(dto));
  }
}

@ApiTags('water-customer-addresses')
@Controller('water/customer-addresses')
export class CustomerAddressesController {
  constructor(
    private readonly addresses: AddressesService,
    private readonly db: WaterDbService,
  ) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update water customer address with audit trail.' })
  async update(@Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return waterOk((await this.db.updateAddress(id, dto)) ?? this.addresses.update(id, dto));
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: 'Set one customer address as the default delivery address.' })
  async setDefault(
    @Param('id') id: string,
    @Body() dto: { reason?: string },
    @Req() request: WaterRequestWithActor,
  ) {
    return waterOk(
      await this.db.setDefaultAddress(id, {
        actor_id: request.waterActor?.actorId,
        actor_role: request.waterActor?.actorRole,
        reason: dto.reason,
      }),
    );
  }

  @Post(':id/reveal-phone')
  @ApiOperation({ summary: 'Reveal one address contact phone with reason and audit log.' })
  async revealPhone(
    @Param('id') id: string,
    @Body() dto: RevealCustomerPhoneDto,
    @Req() request: WaterRequestWithActor,
  ) {
    return waterOk(
      await this.db.revealCustomerAddressPhone(id, {
        actor_id: request.waterActor?.actorId,
        actor_role: request.waterActor?.actorRole,
        reason: dto.reason,
      }),
    );
  }
}
