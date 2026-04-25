import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nick: true,
        plan: true,
        xp: true,
        level: true,
        streak: true,
        lastActivityAt: true,
        createdAt: true,
      },
    });
  }

  async checkNickAvailable(nick: string, excludeUserId?: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        nick: { equals: nick, mode: 'insensitive' },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
    });
    return !existing;
  }

  async updateNick(userId: string, nick: string) {
    // Check if nick is available
    const isAvailable = await this.checkNickAvailable(nick, userId);
    if (!isAvailable) {
      throw new ConflictException('Este nick já está em uso');
    }

    // Check if user changed nick in the last month
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.nickChangedAt) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      if (user.nickChangedAt > oneMonthAgo) {
        throw new ConflictException('Só podes mudar o nick uma vez por mês');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { nick, nickChangedAt: new Date() },
      select: {
        id: true,
        nick: true,
        nickChangedAt: true,
      },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nick: true,
        plan: true,
        xp: true,
        level: true,
        streak: true,
        lastActivityAt: true,
        createdAt: true,
        _count: {
          select: {
            attempts: true,
            studySessions: true,
          },
        },
      },
    });

    return user;
  }
}
