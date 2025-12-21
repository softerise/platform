import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { BookService } from './book.service';
import { ListBooksQuerySchema, RegisterBookSchema } from './book.dto';
import type { ListBooksQueryDto, RegisterBookDto } from './book.dto';
import {
  CurrentUser,
  Roles,
  ZodPipe,
  type CurrentUserData,
} from '../_core';

// TODO: Add proper authentication in production
// @UseGuards(FirebaseAuthGuard, RolesGuard)
// @Roles('SUPER_ADMIN', 'CONTENT_MANAGER')
@Controller('books')
export class BookController {
  constructor(private readonly bookService: BookService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodPipe(RegisterBookSchema)) dto: RegisterBookDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.bookService.registerBook(dto, user);
  }

  @Get(':id')
  async getBook(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.bookService.getBook(id);
  }

  @Get()
  async list(@Query(new ZodPipe(ListBooksQuerySchema)) query: ListBooksQueryDto) {
    return this.bookService.listBooks(query);
  }
}

