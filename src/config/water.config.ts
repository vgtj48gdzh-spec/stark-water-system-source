export interface WaterRuntimeConfig {
  nodeEnv: string;
  port: number;
  databaseEnabled: boolean;
}

export function loadWaterRuntimeConfig(): WaterRuntimeConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.APP_PORT ?? process.env.PORT ?? 3001),
    databaseEnabled: process.env.WATER_DATABASE_ENABLED === 'true',
  };
}
