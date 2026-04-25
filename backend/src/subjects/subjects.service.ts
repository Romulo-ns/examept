import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const subjects = await this.prisma.subject.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // Add question count for each subject
    const subjectsWithCounts = await Promise.all(
      subjects.map(async (subject) => {
        const questionCount = await this.prisma.question.count({
          where: { subjectId: subject.id, isActive: true },
        });
        return { ...subject, questionCount };
      }),
    );

    return subjectsWithCounts;
  }

  async findBySlug(slug: string) {
    return this.prisma.subject.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });
  }

  async getSubjectStats(subjectId: string, userId: string) {
    const [totalQuestions, totalAttempts, correctAttempts] = await Promise.all([
      this.prisma.question.count({
        where: { subjectId, isActive: true },
      }),
      this.prisma.attempt.count({
        where: {
          userId,
          question: { subjectId },
        },
      }),
      this.prisma.attempt.count({
        where: {
          userId,
          question: { subjectId },
          isCorrect: true,
        },
      }),
    ]);

    return {
      totalQuestions,
      totalAttempts,
      correctAttempts,
      successRate:
        totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0,
    };
  }
}
