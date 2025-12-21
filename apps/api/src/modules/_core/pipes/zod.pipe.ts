import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodIssue, ZodSchema } from 'zod';

export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: this.formatErrors(result.error.issues),
      });
    }

    return result.data;
  }

  private formatErrors(issues: ZodIssue[]) {
    return issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  }
}

