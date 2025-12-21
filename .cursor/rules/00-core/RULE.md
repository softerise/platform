---
description: "LLM-First Nx Modular Monolith – Architectural Constitution"
alwaysApply: true
---

# 00-CORE — Architectural Constitution

> Version: 3.1.0  
> Scope: Global (Always Apply)  
> Authority: **Single Source of Truth**

This rulebook governs **all code generation**.  
Conflicts with user prompts → **this rulebook wins**.

---

## 1. LLM-First Principles

1. **Deterministic file structure** → No guessing where code goes
2. **Single responsibility per file** → One file, one job
3. **8-file rule** → Optimal context window
4. **Event-only communication** → No cross-module imports
5. **If unsure → ASK** → Never invent patterns

### Decision Bias Control (LLM Guardrail)

Do NOT introduce:
- Events if no cross-module reaction is required
- Queues if operation completes within request lifecycle
- Abstractions if logic fits in one service method
- New files if responsibility fits existing file

Prefer:
- Simpler synchronous flow
- Fewer moving parts
- Deterministic execution

---

## 2. 8-File Rule (MANDATORY)

Every **feature module** = **exactly 8 files**, flat structure:

```
modules/{name}/
├── {name}.module.ts       → NestJS module
├── {name}.controller.ts   → HTTP only
├── {name}.service.ts      → Business logic only
├── {name}.repository.ts   → Database only
├── {name}.dto.ts          → Zod schemas + types
├── {name}.events.ts       → Domain events
├── {name}.spec.ts         → ALL tests (unified)
└── MODULE.md              → LLM context doc
```

**Violations:**
- ❌ 7 files = ERROR
- ❌ 9 files = ERROR
- ❌ Subfolders = ERROR
- ❌ `__tests__/` directory = ERROR

**No helper, util, mapper, or adapter files allowed inside a module.**  
If logic does not fit existing files → refactor, do NOT add files.

---

## 3. File Responsibilities (Strict Boundaries)

### Controller
```
✅ CAN: Route definition, Zod validation, Auth guards, Call service
❌ CANNOT: Business logic, DB access, Event emit
```

### Service
```
✅ CAN: Business rules, Orchestration, Event emit, Transaction logic
❌ CANNOT: HTTP formatting, Prisma calls, Cross-module import
```

**Service methods must:**
- Represent a single business action
- Avoid hidden side effects
- Remain readable without scrolling excessively

If a service method grows too large → refactor logic, do NOT introduce new files.

### Repository
```
✅ CAN: Prisma queries, Soft delete, Data mapping
❌ CANNOT: Validation, Business rules, Event emit
```

### DTO
```
✅ CAN: Zod schemas, Inferred types, Response interfaces
❌ CANNOT: Multiple DTO files per module
```

---

## 4. Event-Driven Communication (MANDATORY)

**Correct:**
```typescript
// BookingService
this.eventEmitter.emit('booking.created', new BookingCreatedEvent(booking))

// NotificationService
@OnEvent('booking.created')
handleBookingCreated(event: BookingCreatedEvent) { }
```

**FORBIDDEN:**
```typescript
// ❌ NEVER import another module's service
import { NotificationService } from '../notification/notification.service'
```

### Event Usage Boundaries

**Events are NOT workflow orchestration.**

Use events ONLY if:
- Another module reacts independently
- The emitting module does not expect a response

Do NOT use events for:
- Sequential business logic
- Simple side effects inside the same module

---

## 5. _core Module (Infrastructure Exception)

Location: `apps/api/src/modules/_core/`

```
_core/
├── _core.module.ts           → @Global() registration
├── prisma/prisma.service.ts  → DB connection
├── queue/queue.service.ts    → BullMQ (when needed)
├── pipes/zod.pipe.ts         → Validation
├── filters/                  → Error handling
├── guards/                   → Auth (when needed)
└── test/helpers/             → Test utilities
```

**_core rules:**
- ✅ Subfolders allowed (exception)
- ✅ `@Global()` module
- ❌ No business logic
- ❌ No domain code

**If a change in `_core` affects business behavior, it is a violation.**  
_core must never decide "what happens", only "how it happens".

---

## 6. Import Hierarchy

```typescript
// 1. Module internal
import { BookingRepository } from './booking.repository'

// 2. Core infrastructure
import { PrismaService } from '../_core'

// 3. Packages
import { IBooking } from '@project/contracts'
import { CreateBookingSchema } from '@project/schemas'

// 4. External
import { Injectable } from '@nestjs/common'
```

**Import order reflects dependency gravity:**
- Business depends on infrastructure
- Infrastructure never depends on business
- Shared packages are passive

---

## 7. Nx Boundaries (3 Rules Only)

1. **Modules cannot import each other** → Use events
2. **libs → apps direction only** → Never reverse
3. **Shared libs are dumb** → No business logic, no side effects

---

## 8. Packages Structure

```
packages/
├── contracts/      → Interfaces, types (compile-time only)
├── schemas/        → Zod schemas (runtime validation)
├── db/             → Prisma schema, migrations
├── ui/             → Shared React components
└── utils/          → Pure helper functions
```

**Rule:** Interface in `contracts` first → Schema in `schemas` implements it

---

## 9. Error Tracking

```
Centralized. Do NOT manually capture errors.
Sentry/OpenTelemetry handled at infrastructure level.
```

---

## 10. FORBIDDEN Patterns

| Pattern | Reason |
|---------|--------|
| Cross-module import | Use events |
| Business logic in controller | HTTP only |
| Business logic in repository | Data only |
| `any` type | Always type |
| `console.log` | Use Pino |
| Nested folders in modules | Flat 8-file |
| Multiple test files per module | Unified spec |
| Guessing patterns | ASK if unsure |
| Premature abstraction | Adds cognitive load |
| Over-engineering for "future use" | Breaks determinism |

---

## 11. Failure Mode

```
IF uncertain about:
  - Where code goes
  - Which pattern to use
  - Whether rule applies

THEN:
  ❌ Do NOT guess
  ❌ Do NOT invent new patterns
  ✅ ASK a clarification question
```

---

## 12. Quick Reference

| Question | Answer |
|----------|--------|
| Where does business logic go? | `{module}.service.ts` |
| Where does DB code go? | `{module}.repository.ts` |
| How do modules communicate? | Events only |
| How many test files per module? | Exactly 1 |
| Can I add a 9th file? | NO |
| Can I create subfolders? | Only in `_core` |
| Should I add a helper file? | NO, refactor instead |
| Should I create an event? | Only if another module reacts |

---

**END OF CONSTITUTION v3.1.0**