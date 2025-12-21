# Book Module

Book registration and S1 evaluation for the Book Content AI Pipeline.

## 8-File Structure
```
modules/book/
├── book.module.ts        → Nest module
├── book.controller.ts    → HTTP endpoints (register/list/get)
├── book.service.ts       → Business logic + S1 orchestration
├── book.repository.ts    → Prisma queries
├── book.dto.ts           → Zod schemas, types
├── book.events.ts        → BookRegistered, BookEvaluated
├── book.spec.ts          → Tests placeholder (Phase 3)
└── MODULE.md             → This doc
```

## Endpoints
- `POST /api/v1/books` (RegisterBook, requires roles: SUPER_ADMIN or CONTENT_MANAGER)
- `GET /api/v1/books/:id`
- `GET /api/v1/books`

## Behavior
- Validates input with Zod (description >= 100 chars).
- Title uniqueness check; conflicts return BOOK-001.
- S1 evaluation via `LlmService` using Claude primary with GPT-4 fallback.
- Stores verdict/score/confidence/SPI mapping and raw `s1Output`.
- isPipelineEligible set when verdict ∈ {DIAMOND, GOLD}.
- Emits `book.registered` and `book.evaluated` events.

## Prompts
- System/user prompt in `prompts/s1-evaluation.prompt.ts`.
- Response format enforced as JSON; parsed with `S1EvaluationSchema`.

## AuthZ
- Uses `RolesGuard` with required roles (`SUPER_ADMIN`, `CONTENT_MANAGER`).
- Assumes `request.user` populated upstream with BackofficeAdmin context.

## Notes
- No chapter management (Epic 4) or pipeline start (Epic 5) here.
- No delete/update in MVP.

