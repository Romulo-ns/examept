import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get()
  async getRanking(
    @Query('period') period: string = 'WEEK',
    @Query('limit') limit?: string,
  ) {
    const validPeriod = ['WEEK', 'MONTH', 'ALL'].includes(period.toUpperCase())
      ? (period.toUpperCase() as 'WEEK' | 'MONTH' | 'ALL')
      : 'WEEK';

    return this.rankingService.getRanking(
      validPeriod,
      limit ? parseInt(limit) : 100,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyRank(
    @Request() req: any,
    @Query('period') period: string = 'WEEK',
  ) {
    const validPeriod = ['WEEK', 'MONTH', 'ALL'].includes(period.toUpperCase())
      ? (period.toUpperCase() as 'WEEK' | 'MONTH' | 'ALL')
      : 'WEEK';

    return this.rankingService.getUserRank(req.user.id, validPeriod);
  }
}
