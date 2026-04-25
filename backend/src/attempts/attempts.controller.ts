import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { SubmitAttemptDto } from './dto/attempt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('attempts')
@UseGuards(JwtAuthGuard)
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post()
  async submit(@Request() req: any, @Body() dto: SubmitAttemptDto) {
    return this.attemptsService.submit(req.user.id, dto);
  }

  @Get('history')
  async getHistory(@Request() req: any, @Query('limit') limit?: string) {
    return this.attemptsService.getUserAttempts(
      req.user.id,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('today-count')
  async getTodayCount(@Request() req: any) {
    const count = await this.attemptsService.getTodayCount(req.user.id);
    return { count, limit: req.user.plan === 'PREMIUM' ? null : 10 };
  }
}
