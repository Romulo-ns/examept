import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Este email já está registado');
    }

    // Check if nick already exists (case-insensitive)
    const existingNick = await this.prisma.user.findFirst({
      where: { nick: { equals: dto.nick, mode: 'insensitive' } },
    });
    if (existingNick) {
      throw new ConflictException('Este nick já está em uso');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        nick: dto.nick,
        passwordHash,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.nick,
      user.plan,
    );

    // Save refresh token
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(tokens.refreshToken, 10) },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        nick: user.nick,
        plan: user.plan,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.nick,
      user.plan,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(tokens.refreshToken, 10) },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        nick: user.nick,
        plan: user.plan,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
      },
      ...tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Acesso negado');
    }

    const isRefreshValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!isRefreshValid) {
      throw new UnauthorizedException('Token inválido');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.nick,
      user.plan,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(tokens.refreshToken, 10) },
    });

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  private async generateTokens(
    userId: string,
    email: string,
    nick: string,
    plan: string,
  ) {
    const payload = { sub: userId, email, nick, plan };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET') as string,
        expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') as string,
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRATION',
          '7d',
        ) as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
