import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  async findAll() {
    return this.subjectsService.findAll();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.subjectsService.findBySlug(slug);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Param('id') id: string, @Request() req: any) {
    return this.subjectsService.getSubjectStats(id, req.user.id);
  }
}
