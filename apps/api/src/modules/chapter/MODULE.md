# Chapter Module

Chapter CRUD for eligible books prior to pipeline start.

## 8-File Structure
```
modules/chapter/
├── chapter.module.ts      → Nest module
├── chapter.controller.ts  → HTTP endpoints
├── chapter.service.ts     → Business logic (eligibility, locking, word count)
├── chapter.repository.ts  → Prisma queries
├── chapter.dto.ts         → Zod schemas, types
├── chapter.events.ts      → ChapterAdded/Updated/Deleted
├── chapter.spec.ts        → Tests placeholder (Phase 3)
└── MODULE.md              → This doc
```

## Endpoints
- POST `/api/v1/books/:bookId/chapters` (create, auto chapterNumber if absent)
- GET `/api/v1/books/:bookId/chapters` (list with totals)
- PUT `/api/v1/chapters/:id` (update title/content, recalculates wordCount)
- DELETE `/api/v1/chapters/:id`

## Guards & Roles
- `@UseGuards(FirebaseAuthGuard, RolesGuard)`
- Roles: `SUPER_ADMIN`, `CONTENT_MANAGER`

## Business Rules
- Book must exist and be `isPipelineEligible = true`; else BOOK-003.
- Reject when `chaptersLocked = true` → CHAP-001.
- Minimum 500 words → CHAP-002.
- Duplicate chapterNumber → CHAP-003.
- Chapter not found → CHAP-004.

## Notes
- Word count via whitespace split; recalculated on create/update.
- Chapter number auto-increments from current max if not provided.
- Events emitted on create/update/delete.

