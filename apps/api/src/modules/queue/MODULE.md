# Queue Module (BullMQ)

BullMQ infrastructure for pipeline step processing (Epic 5.3).

## Structure
```
modules/queue/
├── queue.module.ts       → BullMQ configuration + queue registration
├── queue.controller.ts   → Queue health endpoint (SUPER_ADMIN)
├── queue.service.ts      → Queue operations (add jobs, bulk, health, pause/resume)
├── queue.types.ts        → Job payloads, queue names, job options
├── base.processor.ts     → Abstract processor with event hooks
├── queue.events.ts       → Queue event definitions
├── queue.spec.ts         → Tests placeholder
└── MODULE.md             → This doc
```

## Queues
- `pipeline-steps` (S2, S3, S6, S7)
- `pipeline-episodes` (S4, S5 episodes)

## Defaults
- Retries: 3 attempts (1 initial + 2 retries)
- Backoff: exponential, 1s → 2s → 4s
- Timeout: 5m for steps, 3m for episodes
- removeOnComplete: 100, removeOnFail: 500

## Health Endpoint
- `GET /api/v1/queues/health` (SUPER_ADMIN)

## Notes
- Redis connection via `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.
- Actual processors/step handlers will be added in later epics (5.4, 6-8).


