import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WaterPublic } from './auth/water-public.decorator';

@ApiTags('water-health')
@WaterPublic()
@Controller('water')
export class WaterController {
  @Get('health')
  health() {
    return {
      ok: true,
      system: 'stark-water-system',
      stage: 'S0/S1',
      mode: 'independent-water-platform',
      hqIntegration: 'reserved-via-water_business_events-api-hq_id-sync_status',
    };
  }
}
