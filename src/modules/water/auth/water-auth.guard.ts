import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WATER_PUBLIC_ROUTE } from './water-public.decorator';
import { WaterAuthService } from './water-auth.service';
import { WaterRequestWithActor } from './water-auth.types';

@Injectable()
export class WaterAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: WaterAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(WATER_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<WaterRequestWithActor>();
    const token = extractBearerToken(request);
    const actor = await this.auth.authenticate(token);
    request.waterActor = actor;
    request.waterToken = token;
    return true;
  }
}

function extractBearerToken(request: WaterRequestWithActor): string | undefined {
  const raw = request.headers?.authorization ?? request.headers?.Authorization;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  const [type, token] = value.split(/\s+/);
  return type?.toLowerCase() === 'bearer' ? token : undefined;
}
