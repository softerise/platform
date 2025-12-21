---
description: "NestJS API Backend – Tool Boundaries & Complexity Control"
globs:
  - "apps/api/**"
alwaysApply: false
---

# 01-API — NestJS Backend Rules

> Version: 1.1.0  
> Scope: `apps/api/**`  
> Trigger: Glob-based

Extends **00-core**. For architectural rules, see **00-core/RULE.md**.

---

## 1. Module Location

```
apps/api/src/
├── modules/
│   ├── _core/              → Shared infrastructure (exception)
│   └── {feature}/          → Feature modules (8-file rule)
├── app.module.ts
└── main.ts
```

---

## 2. Code Boundaries (Reminder)

| File | Responsibility |
|------|----------------|
| Controller | HTTP + validation only |
| Service | Business logic only |
| Repository | Prisma access only |
| DTO | Zod schemas + types only |

---

## 3. Complexity Guardrail

Do NOT introduce:
- Queues if sync flow is sufficient
- Events if no other module reacts
- New services for one-off logic
- Infrastructure for hypothetical future needs

Prefer:
- Simpler synchronous code
- Fewer moving parts

---

## 4. Tool Usage Boundaries

### 4.1 BullMQ — NOT Default

BullMQ is infrastructure for background jobs.

**Use ONLY if:**
- Operation is long-running (>2 seconds)
- Operation is retryable on failure
- Operation is NOT part of request-response flow

**Do NOT use for:**
- Simple async side effects
- Notifications (use events)
- Database writes
- Operations completing within request lifecycle

---

### 4.2 LlamaIndex — RAG Only

LlamaIndex is for semantic search and RAG only.

**Use ONLY for:**
- Semantic search
- Retrieval-augmented generation
- Document indexing

**Do NOT:**
- Use inside repositories
- Replace business logic with AI
- Call in synchronous request flow (except search endpoints)

---

### 4.3 Pino Logging — Boundaries Only

**Log at:**
- Service method entry (important operations)
- External API calls
- Error boundaries

**Do NOT log:**
- Inside loops
- Inside repositories
- Raw request/response bodies

---

### 4.4 Firebase Admin SDK — Infrastructure Only

Firebase is infrastructure, not domain.

**Rules:**
- Access via dedicated services only (`packages/infra-firebase/` or `_core/`)
- Do NOT import Firebase directly in feature modules
- Do NOT put business logic in Firebase services

---

### 4.5 Sentry / OpenTelemetry — Centralized

Error tracking is centralized via global exception filter.

**Do NOT:**
- Add `Sentry.captureException()` manually
- Create manual spans for every operation
- Duplicate error logging in catch blocks

---

### 4.6 Swagger (OpenAPI)

Swagger is documentation only.

- Use decorators only in controllers
- Do NOT add Swagger-specific logic
- Do NOT treat Swagger as validation or security layer

---

## 5. Database Rules

- Soft delete via `deletedAt`
- UUID primary keys
- Always filter: `where: { deletedAt: null }`

---

## 6. API Conventions

- Use NestJS built-in HTTP exceptions. Do NOT create custom error classes.
- REST: plural nouns, no verbs, standard CRUD mapping

---

## 7. Quick Reference

| Question | Answer |
|----------|--------|
| Should I use BullMQ? | Only if >2s, retryable, background |
| Should I log this? | Only at service boundaries |
| Should I catch and report to Sentry? | No, global filter handles it |
| Can I import Firebase directly? | No, use dedicated service |
| Should I add a new service? | Only if logic doesn't fit existing |

---

**END OF API RULES v1.1.0**