import { z } from 'zod';

export const AddChapterSchema = z.object({
    chapterNumber: z.number().int().positive().optional(),
    chapterTitle: z.string().min(1).optional(),
    content: z.string().min(1, { message: 'Content is required' }),
});

export type AddChapterDto = z.infer<typeof AddChapterSchema>;

export const UpdateChapterSchema = z.object({
    chapterTitle: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
});

export type UpdateChapterDto = z.infer<typeof UpdateChapterSchema>;

export interface ChapterResponse {
    chapterId: string;
    bookId: string;
    chapterNumber: number;
    chapterTitle: string | null;
    wordCount: number;
    createdAt: string;
}

export interface ChapterUpdateResponse {
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string | null;
    wordCount: number;
    updatedAt: string;
}

export interface ChapterListItem {
    id: string;
    chapterNumber: number;
    chapterTitle: string | null;
    wordCount: number;
    createdAt: string;
}

export interface ChapterListResponse {
    bookId: string;
    chapters: ChapterListItem[];
    totalChapters: number;
    totalWordCount: number;
}

