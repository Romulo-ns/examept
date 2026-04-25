import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  async getRanking(period: 'WEEK' | 'MONTH' | 'ALL', limit = 100) {
    const rankings = await this.prisma.rankingCache.findMany({
      where: { period },
      include: {
        user: {
          select: {
            id: true,
            nick: true,
            level: true,
            xp: true,
          },
        },
      },
      orderBy: { score: 'desc' },
      take: limit,
    });

    return rankings.map((r, index) => ({
      rank: index + 1,
      userId: r.userId,
      nick: r.user.nick,
      level: r.user.level,
      score: r.score,
    }));
  }

  async getUserRank(userId: string, period: 'WEEK' | 'MONTH' | 'ALL') {
    const userRanking = await this.prisma.rankingCache.findUnique({
      where: { userId_period: { userId, period } },
    });

    if (!userRanking) return { rank: null, score: 0 };

    // Count how many users have higher score
    const higherCount = await this.prisma.rankingCache.count({
      where: {
        period,
        score: { gt: userRanking.score },
      },
    });

    return {
      rank: higherCount + 1,
      score: userRanking.score,
    };
  }

  async resetWeeklyRanking() {
    await this.prisma.rankingCache.deleteMany({
      where: { period: 'WEEK' },
    });
  }

  async resetMonthlyRanking() {
    await this.prisma.rankingCache.deleteMany({
      where: { period: 'MONTH' },
    });
  }
}
