import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { waterOk } from '../common/water-api-response';
import { WaterLoginDto } from './dto/login.dto';
import { WaterAuthService } from './water-auth.service';
import { WaterRequestWithActor } from './water-auth.types';
import { WaterPublic } from './water-public.decorator';

@ApiTags('water-auth')
@Controller('water/auth')
export class WaterAuthController {
  constructor(private readonly auth: WaterAuthService) {}

  @WaterPublic()
  @Post('login')
  @ApiOperation({ summary: 'Login to V0 internal water admin with an env/seeded account.' })
  async login(@Body() dto: WaterLoginDto, @Req() request: WaterRequestWithActor) {
    return waterOk(
      await this.auth.login(dto.username, dto.password, {
        ipAddress: request.ip ?? null,
        userAgent: request.get?.('user-agent') ?? null,
      }),
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Return the current V0 water admin actor.' })
  async me(@Req() request: WaterRequestWithActor) {
    return waterOk(await this.auth.me(request.waterActor!));
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke the current V0 water admin session.' })
  async logout(@Req() request: WaterRequestWithActor) {
    return waterOk(
      await this.auth.logout(request.waterToken, request.waterActor!, {
        ipAddress: request.ip ?? null,
        userAgent: request.get?.('user-agent') ?? null,
      }),
    );
  }
}
