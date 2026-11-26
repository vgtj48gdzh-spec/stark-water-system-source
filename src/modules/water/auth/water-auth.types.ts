import { WaterRole } from '../common/water.enums';

export interface WaterActor {
  actorId: string;
  actorRole: WaterRole;
  username: string;
  sessionId?: string;
}

export interface WaterRequestWithActor {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  path?: string;
  body?: Record<string, unknown>;
  ip?: string;
  get?: (header: string) => string | undefined;
  waterActor?: WaterActor;
  waterToken?: string;
}
