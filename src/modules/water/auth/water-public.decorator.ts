import { SetMetadata } from '@nestjs/common';

export const WATER_PUBLIC_ROUTE = 'waterPublicRoute';

export const WaterPublic = () => SetMetadata(WATER_PUBLIC_ROUTE, true);
