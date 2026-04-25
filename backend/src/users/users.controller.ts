import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch('me/nick')
  @UseGuards(JwtAuthGuard)
  async updateNick(@Request() req: any, @Body('nick') nick: string) {
    return this.usersService.updateNick(req.user.id, nick);
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Request() req: any) {
    return this.usersService.getUserStats(req.user.id);
  }

  @Get('check-nick')
  async checkNick(@Query('nick') nick: string) {
    const available = await this.usersService.checkNickAvailable(nick);
    return { available };
  }
}
