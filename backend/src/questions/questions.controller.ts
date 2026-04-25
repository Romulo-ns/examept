import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query('subjectId') subjectId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('year') year?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.questionsService.findAll({
      subjectId,
      difficulty: difficulty ? parseInt(difficulty) : undefined,
      year: year ? parseInt(year) : undefined,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get('next')
  @UseGuards(JwtAuthGuard)
  async getNext(@Request() req: any, @Query('subjectId') subjectId?: string) {
    return this.questionsService.getNextAdaptive(req.user.id, subjectId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.questionsService.findById(id);
  }
}
