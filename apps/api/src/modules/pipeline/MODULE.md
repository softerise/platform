# Pipeline Module

Book Content AI Pipeline orchestration (shell) for Epic 5.1.

## 8-File Structure
```
modules/pipeline/
├── pipeline.module.ts       → Nest module
├── pipeline.controller.ts   → HTTP endpoints (shell)
├── pipeline.service.ts      → Business logic scaffolding
├── pipeline.repository.ts   → Prisma queries for PipelineRun/StepExecution
├── pipeline.dto.ts          → Zod schemas, DTOs
├── pipeline.events.ts       → Pipeline domain events
├── pipeline.spec.ts         → Tests placeholder
└── MODULE.md                → This doc
```

## Endpoints (shell)
- `POST /api/v1/pipelines` (Start pipeline)
- `GET /api/v1/pipelines/:id`
- `GET /api/v1/pipelines`
- `GET /api/v1/pipelines/:id/steps`
- `GET /api/v1/pipelines/:id/progress`
- `POST /api/v1/pipelines/:id/cancel`
- `POST /api/v1/pipelines/:id/resume`

## Step Execution Framework (Epic 5.4)
- `step-handlers/step-handler.interface.ts` defines handler contract.
- `step-execution.service.ts` manages lifecycle (create, running, success, failed).
- `step-executor.ts` orchestrates handler execution, LLM calls, validation, retries signaling.
- `checkpoint.service.ts` saves pipeline checkpoints (JSONB) and resume hints.
- Step events emitted: `step.created`, `step.started`, `step.completed`, `step.failed`.

## Behavior (shell)
- Validates input with Zod + `ZodPipe`.
- Preconditions: book exists, is pipeline-eligible, has chapters, no active pipeline (PIP-001), no completed course (PIP-002).
- Creates or resets a `PipelineRun` with status `CREATED` (no queue/state machine yet).
- Cancel updates status to `CANCELLED` when allowed (PIP-004).
- Resume validates `PAUSED` state and returns checkpoint hint.
- Read endpoints return pipeline details, step summaries, and progress based on stored fields.

## AuthZ
- Uses `FirebaseAuthGuard` + `RolesGuard`.
- Roles required: `SUPER_ADMIN`, `CONTENT_MANAGER`.

## Out of Scope
- State machine transitions (Epic 5.2)
- Queue/BullMQ wiring (Epic 5.3)
- Step execution logic (Epic 5.4)
- Orchestration + human review submission (Epic 5.5+)


