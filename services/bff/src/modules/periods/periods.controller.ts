import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { PeriodsClient } from './periods.client';

/** Public historical reference (read-only). */
@Controller('periods')
export class PeriodsController {
  constructor(private readonly periods: PeriodsClient) {}

  @Get('categories')
  listCategories() {
    return this.periods.listCategories(true);
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
}
