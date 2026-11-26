import { Module } from '@nestjs/common';
import { WaterModule } from './modules/water/water.module';

@Module({
  imports: [WaterModule],
})
export class AppModule {}
