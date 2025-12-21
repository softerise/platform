import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ChapterService } from './chapter.service';
import {
  AddChapterDto,
  AddChapterSchema,
  UpdateChapterDto,
  UpdateChapterSchema,
  type ChapterListResponse,
  type ChapterResponse,
  type ChapterUpdateResponse,
} from './chapter.dto';
import {
  CurrentUser,
  ZodPipe,
  type CurrentUserData,
} from '../_core';

// TODO: Add proper authentication in production
// @UseGuards(FirebaseAuthGuard, RolesGuard)
// @Roles('SUPER_ADMIN', 'CONTENT_MANAGER')
@Controller('books')
export class ChapterController {
  constructor(private readonly chapterService: ChapterService) { }

  @Post(':bookId/chapters')
  @HttpCode(HttpStatus.CREATED)
  async addChapter(
    @Param('bookId', new ParseUUIDPipe()) bookId: string,
    @Body(new ZodPipe(AddChapterSchema)) dto: AddChapterDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ChapterResponse> {
    return this.chapterService.addChapter(bookId, dto, user);
  }

  @Get(':bookId/chapters')
  async listChapters(
    @Param('bookId', new ParseUUIDPipe()) bookId: string,
  ): Promise<ChapterListResponse> {
    return this.chapterService.listChapters(bookId);
  }

  @Get(':bookId/chapters/:id')
  async getChapter(
    @Param('bookId', new ParseUUIDPipe()) bookId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ChapterResponse> {
    return this.chapterService.getChapter(bookId, id);
  }

  @Put(':bookId/chapters/:id')
  async updateChapter(
    @Param('bookId', new ParseUUIDPipe()) bookId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodPipe(UpdateChapterSchema)) dto: UpdateChapterDto,
  ): Promise<ChapterUpdateResponse> {
    return this.chapterService.updateChapter(id, dto);
  }

  @Delete(':bookId/chapters/:id')
  async deleteChapter(
    @Param('bookId', new ParseUUIDPipe()) bookId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.chapterService.deleteChapter(id);
  }
}

