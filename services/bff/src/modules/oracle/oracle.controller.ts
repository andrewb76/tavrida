import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompareRequestDto, SimulateRequestDto } from './dto/oracle.dto';
import { OracleService } from './oracle.service';

@Controller('admin/oracle')
@UseGuards(JwtAuthGuard, AdminGuard)
export class OracleController {
  constructor(private readonly oracle: OracleService) {}

  @Get('defaults')
  getDefaults() {
    return this.oracle.getDefaults();
  }

  @Post('simulate')
  simulate(@Body() body: SimulateRequestDto) {
    return this.oracle.simulateRequest(body);
  }

  @Post('compare')
  compare(@Body() body: CompareRequestDto) {
    return this.oracle.compareRequests(body.scenarios);
  }
}
