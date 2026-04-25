import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserStats(userId: string) {
    // Total attempts and correct
    const [totalAttempts, correctAttempts] = await Promise.all([
      this.prisma.attempt.count({ where: { userId } }),
      this.prisma.attempt.count({ where: { userId, isCorrect: true } }),
    ]);

    // User info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, streak: true },
    });

    // Stats per subject
    const subjects = await this.prisma.subject.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
    });

    const subjectStats = await Promise.all(
      subjects.map(async (subject) => {
        const [total, correct] = await Promise.all([
          this.prisma.attempt.count({
            where: { userId, question: { subjectId: subject.id } },
          }),
          this.prisma.attempt.count({
            where: {
              userId,
              question: { subjectId: subject.id },
              isCorrect: true,
            },
          }),
        ]);

        return {
          subjectId: subject.id,
          subjectName: subject.name,
          subjectSlug: subject.slug,
          totalAttempts: total,
          correctAttempts: correct,
          successRate: total > 0 ? Math.round((correct / total) * 100) : 0,
        };
      }),
    );

    // Weekly activity (last 7 days)
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await this.prisma.attempt.count({
        where: {
          userId,
          createdAt: { gte: date, lt: nextDate },
        },
      });

      weeklyActivity.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('pt-PT', { weekday: 'short' }),
        count,
      });
    }

    return {
      totalAttempts,
      correctAttempts,
      successRate:
        totalAttempts > 0
          ? Math.round((correctAttempts / totalAttempts) * 100)
          : 0,
      xp: user?.xp || 0,
      level: user?.level || 1,
      streak: user?.streak || 0,
      subjectStats: subjectStats.filter((s) => s.totalAttempts > 0),
      weeklyActivity,
    };
  }
}
