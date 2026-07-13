import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompareRequestDto, SimulateRequestDto } from './dto/vanga.dto';
import { VangaService } from './vanga.service';

@Controller('admin/vanga')
@UseGuards(JwtAuthGuard, AdminGuard)
export class VangaController {
  constructor(private readonly vanga: VangaService) {}

  @Get('defaults')
  getDefaults() {
    return this.vanga.getDefaults();
  }

  @Post('simulate')
  simulate(@Body() body: SimulateRequestDto) {
    return this.vanga.simulateRequest(body);
  }

  @Post('compare')
  compare(@Body() body: CompareRequestDto) {
    return this.vanga.compareRequests(body.scenarios);
  }
}
