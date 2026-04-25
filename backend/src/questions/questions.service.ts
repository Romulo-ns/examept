import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    subjectId?: string;
    difficulty?: number;
    year?: number;
    limit?: number;
    offset?: number;
  }) {
    const { subjectId, difficulty, year, limit = 20, offset = 0 } = filters;

    const where: any = { isActive: true };
    if (subjectId) where.subjectId = subjectId;
    if (difficulty) where.difficulty = difficulty;
    if (year) where.year = year;

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: {
          subject: { select: { id: true, name: true, slug: true } },
          options: {
            select: { id: true, label: true, text: true, position: true },
            orderBy: { position: 'asc' },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.question.count({ where }),
    ]);

    return { questions, total, limit, offset };
  }

  async findById(id: string, includeCorrect = false) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, slug: true } },
        options: {
          select: {
            id: true,
            label: true,
            text: true,
            position: true,
            ...(includeCorrect ? { isCorrect: true } : {}),
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    return question;
  }

  async getNextAdaptive(userId: string, subjectId?: string) {
    // Get user's recent attempts to avoid repeating questions
    const recentAttempts = await this.prisma.attempt.findMany({
      where: { userId },
      select: { questionId: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const recentIds = recentAttempts.map((a) => a.questionId);

    // Get user performance to determine target difficulty
    const performance = await this.prisma.attempt.aggregate({
      where: { userId },
      _count: { id: true },
      _avg: { xpEarned: true },
    });

    // Calculate user's success rate
    const correctCount = await this.prisma.attempt.count({
      where: { userId, isCorrect: true },
    });
    const totalCount = performance._count.id || 1;
    const successRate = correctCount / totalCount;

    // Target difficulty: if success rate is high, increase difficulty
    let targetDifficulty = 3; // default medium
    if (successRate > 0.8) targetDifficulty = 4;
    if (successRate > 0.9) targetDifficulty = 5;
    if (successRate < 0.5) targetDifficulty = 2;
    if (successRate < 0.3) targetDifficulty = 1;

    const where: any = {
      isActive: true,
      difficulty: { gte: targetDifficulty - 1, lte: targetDifficulty + 1 },
    };

    if (subjectId) where.subjectId = subjectId;
    if (recentIds.length > 0) where.id = { notIn: recentIds };

    // Try to find an adaptive question
    let question = await this.prisma.question.findFirst({
      where,
      include: {
        subject: { select: { id: true, name: true, slug: true } },
        options: {
          select: { id: true, label: true, text: true, position: true },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fallback: any question not recently attempted
    if (!question) {
      delete where.difficulty;
      question = await this.prisma.question.findFirst({
        where,
        include: {
          subject: { select: { id: true, name: true, slug: true } },
          options: {
            select: { id: true, label: true, text: true, position: true },
            orderBy: { position: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return question;
  }

  async updateDifficulty(questionId: string) {
    const result = await this.prisma.attempt.groupBy({
      by: ['questionId'],
      where: { questionId },
      _count: { id: true },
    });

    const totalAttempts = result[0]?._count?.id || 0;
    if (totalAttempts < 10) return; // min samples

    const correctCount = await this.prisma.attempt.count({
      where: { questionId, isCorrect: true },
    });

    const successRate = correctCount / totalAttempts;
    const computed = Math.max(
      1,
      Math.min(5, Math.round((1 - successRate) * 5) + 1),
    );

    await this.prisma.question.update({
      where: { id: questionId },
      data: { difficultyComputed: computed },
    });
  }
}
