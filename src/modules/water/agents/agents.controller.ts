import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { paginateRecords, waterPage } from '../common/water-api-response';
import { WaterDbService } from '../common/water-db.service';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';

@ApiTags('water-agents')
@Controller('water/agents')
export class AgentsController {
  constructor(
    private readonly agents: AgentsService,
    private readonly db: WaterDbService,
  ) {}

  @Get()
  async list() {
    const records = (await this.db.listAgents()) ?? this.agents.list();
    return waterPage(paginateRecords(records as Record<string, unknown>[]));
  }

  @Post()
  create(@Body() dto: CreateAgentDto) {
    return this.agents.create(dto);
  }
}
