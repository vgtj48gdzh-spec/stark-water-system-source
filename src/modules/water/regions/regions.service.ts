import { Injectable } from '@nestjs/common';
import { WaterMockStoreService } from '../common/water-mock-store.service';
import { CreateRegionDto } from './dto/create-region.dto';

@Injectable()
export class RegionsService {
  private readonly collection = 'regions';

  constructor(private readonly store: WaterMockStoreService) {}

  list() {
    return this.store.list(this.collection);
  }

  create(dto: CreateRegionDto) {
    return this.store.create(this.collection, dto);
  }
}
