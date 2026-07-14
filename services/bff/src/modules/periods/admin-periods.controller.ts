import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PeriodsClient } from './periods.client';

@Controller('admin/periods')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPeriodsController {
  constructor(private readonly periods: PeriodsClient) {}

  @Get('categories')
  listCategories(@Query('activeOnly') activeOnly?: string) {
    return this.periods.listCategories(activeOnly === 'true');
  }

  @Get('categories/:id')
  getCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.periods.getCategory(id);
  }

  @Post('categories')
  createCategory(@Body() body: unknown) {
    return this.periods.createCategory(body);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.periods.updateCategory(id, body);
  }

  @Delete('categories/:id')
  removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.periods.removeCategory(id);
  }

  @Get()
  list(
    @Query('categoryId') categoryId?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('parentId') parentId?: string,
    @Query('rootId') rootId?: string,
    @Query('rootsOnly') rootsOnly?: string,
    @Query('maxDepth') maxDepth?: string,
    @Query('metadata') metadata?: string,
    @Query('view') view?: string,
  ) {
    return this.periods.listPeriods({
      categoryId,
      categorySlug,
      from,
      to,
      parentId,
      rootId,
      rootsOnly,
      maxDepth,
      metadata,
      view,
    });
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.periods.getPeriod(id);
  }

  @Post()
  create(@Body() body: unknown) {
    return this.periods.createPeriod(body);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.periods.updatePeriod(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.periods.removePeriod(id);
  }

  @Put(':id/children')
  replaceChildren(@Param('id', ParseUUIDPipe) id: string, @Body() body: { children: unknown[] }) {
    return this.periods.replaceChildren(id, body.children ?? []);
  }
}
