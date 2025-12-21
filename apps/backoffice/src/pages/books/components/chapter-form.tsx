import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreate, useUpdate } from '@refinedev/core';
import {
  Label,
  Input,
  Textarea,
  Button,
} from '@project/ui';

const chapterSchema = z.object({
  chapterTitle: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(100, 'Content must be at least 100 characters'),
});

type ChapterFormValues = z.infer<typeof chapterSchema>;

interface Chapter {
  id: string;
  chapterTitle: string;
  content: string;
  wordCount?: number;
  isLocked?: boolean;
}

interface ChapterFormProps {
  bookId: string;
  chapter?: Chapter | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function ChapterForm({
  bookId,
  chapter,
  onSuccess,
  onCancel,
}: ChapterFormProps) {
  const isEditing = !!chapter;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterSchema),
    defaultValues: {
      chapterTitle: chapter?.chapterTitle ?? '',
      content: chapter?.content ?? '',
    },
  });

  const { mutate: createChapter, isLoading: creating } = useCreate();
  const { mutate: updateChapter, isLoading: updating } = useUpdate();

  const contentValue = watch('content');
  const wordCount = React.useMemo(() => {
    return contentValue?.split(/\s+/).filter(Boolean).length ?? 0;
  }, [contentValue]);

  const isLoading = creating || updating;

  const onSubmit = (values: ChapterFormValues) => {
    if (isEditing && chapter) {
      updateChapter(
        {
          resource: `books/${bookId}/chapters`,
          id: chapter.id,
          values,
        },
        { onSuccess },
      );
    } else {
      createChapter(
        {
          resource: `books/${bookId}/chapters`,
          values,
        },
        { onSuccess },
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="chapterTitle">Chapter Title</Label>
        <Input
          id="chapterTitle"
          placeholder="Enter chapter title"
          {...register('chapterTitle')}
        />
        {errors.chapterTitle && (
          <p className="text-sm text-destructive">
            {errors.chapterTitle.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          placeholder="Enter chapter content..."
          rows={12}
          className="font-mono text-sm"
          {...register('content')}
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Word count: <span className="font-medium">{wordCount.toLocaleString()}</span>
            {wordCount < 100 && (
              <span className="text-amber-600 ml-2">
                (minimum 100 required)
              </span>
            )}
          </span>
        </div>
        {errors.content && (
          <p className="text-sm text-destructive">{errors.content.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? 'Saving...'
            : isEditing
              ? 'Update Chapter'
              : 'Add Chapter'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

