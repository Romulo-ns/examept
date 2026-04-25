import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionsService } from '../questions/questions.service';
import { SubmitAttemptDto } from './dto/attempt.dto';

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questionsService: QuestionsService,
  ) {}

  async submit(userId: string, dto: SubmitAttemptDto) {
    // Check daily limit for free users
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado');

    if (user.plan === 'FREE') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayAttempts = await this.prisma.attempt.count({
        where: {
          userId,
          createdAt: { gte: todayStart },
        },
      });

      if (todayAttempts >= 10) {
        throw new ForbiddenException(
          'Atingiste o limite diário de 10 exercícios. Faz upgrade para Premium para exercícios ilimitados!',
        );
      }
    }

    // Get the correct answer
    const question = await this.prisma.question.findUnique({
      where: { id: dto.questionId },
      include: { options: true },
    });

    if (!question) throw new NotFoundException('Questão não encontrada');

    const selectedOption = question.options.find((o) => o.id === dto.optionId);
    if (!selectedOption) throw new NotFoundException('Opção não encontrada');

    const isCorrect = selectedOption.isCorrect;

    // Calculate XP
    let xpEarned = 0;
    if (isCorrect) {
      xpEarned = 10; // base XP
      xpEarned += (question.difficultyComputed || question.difficulty) * 4; // difficulty bonus
      if (dto.hintUsed) {
        xpEarned = user.plan === 'PREMIUM' ? Math.round(xpEarned * 0.5) : 0;
      }
      if (dto.timeSpentMs && dto.timeSpentMs < 30000) {
        xpEarned += 5; // speed bonus
      }
    }

    // Create attempt
    const attempt = await this.prisma.attempt.create({
      data: {
        userId,
        questionId: dto.questionId,
        optionId: dto.optionId,
        isCorrect,
        hintUsed: dto.hintUsed || false,
        timeSpentMs: dto.timeSpentMs,
        xpEarned,
      },
    });

    // Update user XP and streak
    if (xpEarned > 0) {
      await this.updateUserXpAndStreak(userId, xpEarned);
    }

    // Update question difficulty (async, fire and forget)
    this.questionsService.updateDifficulty(dto.questionId).catch(() => {});

    // Update ranking
    if (xpEarned > 0) {
      await this.updateRanking(userId, xpEarned);
    }

    // Get correct option for feedback
    const correctOption = question.options.find((o) => o.isCorrect);

    return {
      isCorrect,
      xpEarned,
      correctOptionId: correctOption?.id,
      correctOptionLabel: correctOption?.label,
      explanation:
        isCorrect || user.plan === 'PREMIUM' ? question.explanation : null,
      hint: question.hint,
    };
  }

  private async updateUserXpAndStreak(userId: string, xpEarned: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const now = new Date();
    let newStreak = user.streak;

    if (user.lastActivityAt) {
      const lastActivity = new Date(user.lastActivityAt);
      const diffMs = now.getTime() - lastActivity.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day, no streak update
      } else if (diffDays === 1) {
        newStreak += 1;
      } else {
        newStreak = 1; // streak broken
      }
    } else {
      newStreak = 1;
    }

    // Calculate level (every 100 XP = 1 level)
    const totalXp = user.xp + xpEarned;
    const newLevel = Math.floor(totalXp / 100) + 1;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: xpEarned },
        level: newLevel,
        streak: newStreak,
        lastActivityAt: now,
      },
    });
  }

  private async updateRanking(userId: string, xpEarned: number) {
    const periods: Array<'WEEK' | 'MONTH' | 'ALL'> = ['WEEK', 'MONTH', 'ALL'];

    for (const period of periods) {
      await this.prisma.rankingCache.upsert({
        where: { userId_period: { userId, period } },
        update: { score: { increment: xpEarned } },
        create: { userId, period, score: xpEarned },
      });
    }
  }

  async getUserAttempts(userId: string, limit = 20) {
    return this.prisma.attempt.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            subject: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getTodayCount(userId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return this.prisma.attempt.count({
      where: {
        userId,
        createdAt: { gte: todayStart },
      },
    });
  }
}
