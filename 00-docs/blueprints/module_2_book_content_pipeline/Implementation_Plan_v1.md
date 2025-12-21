## 📊 Implementation Plan

**Module:** Book Content AI Pipeline
**Blueprint Version:** 1.1
**Mode:** 🆕 GREENFIELD

---

### Epic Breakdown

| # | Epic | Type | Complexity | Dependencies | Scope |
|---|------|------|------------|--------------|-------|
| **E1** | Database Schema & Enums | NEW | MEDIUM | - | Prisma models, enums, migration |
| **E2** | LLM Integration Infrastructure | NEW | MEDIUM | - | Claude/GPT-4 wrapper, fallback logic |
| **E3** | Book Module - Core CRUD | NEW | MEDIUM | E1 | Book entity, S1 evaluation, registration |
| **E4** | Chapter Module | NEW | LOW | E3 | Chapter CRUD, word count, locking |
| **E5** | Pipeline Module - Foundation | NEW | HIGH | E1, E2, E3 | PipelineRun, StepExecution, state machine |
| **E6** | Pipeline Steps - S2 & S3 | NEW | HIGH | E5 | Idea inspiration, Course outline, Human review gate |
| **E7** | Pipeline Steps - S4 & S5 | NEW | HIGH | E6 | Episode draft/content, parallel processing |
| **E8** | Pipeline Steps - S6 & S7 | NEW | HIGH | E7 | Practice content, Final evaluation |
| **E9** | Course Module | NEW | MEDIUM | E8 | Course, Episode, PracticeSession, Question, Answer |
| **E10** | Human Review & Operations | NEW | MEDIUM | E5, E9 | Review gates, stuck resolution, deploy |
| **E11** | BackOffice UI - Book Management | NEW | MEDIUM | E3, E4 | Book list, detail, register modal, chapters |
| **E12** | BackOffice UI - Pipeline Management | NEW | HIGH | E5, E10 | Pipeline list, detail, progress, reviews |
| **E13** | BackOffice UI - Course Management | NEW | LOW | E9 | Course list, detail, deploy |

---

### Execution Order Rationale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXECUTION FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

Phase 1: Foundation
├── E1: Database Schema ──────────────┐
└── E2: LLM Infrastructure ───────────┤
                                      │
Phase 2: Core Entities                │
├── E3: Book Module ◄─────────────────┤
└── E4: Chapter Module ◄──────────────┘
                │
Phase 3: Pipeline Engine              │
├── E5: Pipeline Foundation ◄─────────┘
├── E6: Steps S2 & S3 ◄───────────────┤
├── E7: Steps S4 & S5 ◄───────────────┤
└── E8: Steps S6 & S7 ◄───────────────┘
                │
Phase 4: Output & Operations          │
├── E9: Course Module ◄───────────────┤
└── E10: Human Review ◄───────────────┘
                │
Phase 5: BackOffice UI                │
├── E11: UI - Books ◄─────────────────┤
├── E12: UI - Pipelines ◄─────────────┤
└── E13: UI - Courses ◄───────────────┘
```

**Why this order:**
1. **E1-E2 parallel-ready:** No dependencies, can be done together
2. **E3-E4 sequential:** Chapter depends on Book
3. **E5-E8 pipeline chain:** Each step builds on previous
4. **E9-E10 after pipeline:** Need complete step outputs
5. **E11-E13 last:** UI consumes API endpoints

---

### Risk Areas

| Risk | Epic | Mitigation |
|------|------|------------|
| LLM response validation complexity | E6-E8 | Strict Zod schemas, retry with feedback |
| Parallel episode processing | E7 | BullMQ concurrency limits, checkpoint saves |
| State machine complexity | E5 | Clear status transitions, comprehensive logging |
| Long-running pipeline timeout | E7-E8 | 2-hour timeout, auto-pause, checkpoint recovery |
| Human review UX | E12 | Real-time progress via polling/SSE |

---

### Estimated Effort

| Phase | Epics | Complexity | Estimate |
|-------|-------|------------|----------|
| Foundation | E1, E2 | 2× MEDIUM | 2-3 sessions |
| Core Entities | E3, E4 | MEDIUM + LOW | 2 sessions |
| Pipeline Engine | E5-E8 | 4× HIGH | 6-8 sessions |
| Output & Ops | E9, E10 | 2× MEDIUM | 2-3 sessions |
| BackOffice UI | E11-E13 | MEDIUM + HIGH + LOW | 3-4 sessions |
| **TOTAL** | 13 epics | - | **15-20 sessions** |

---

### Module Structure Preview

```
apps/api/src/modules/
├── book/
│   ├── book.module.ts
│   ├── book.controller.ts
│   ├── book.service.ts
│   ├── book.repository.ts
│   ├── book.dto.ts
│   ├── book.events.ts
│   ├── book.spec.ts (Phase 3)
│   └── MODULE.md
├── chapter/
│   └── (8-file structure)
├── pipeline/
│   └── (8-file structure)
├── course/
│   └── (8-file structure)
└── llm/
    └── (8-file structure - infrastructure)

apps/backoffice/src/
├── pages/
│   ├── books/
│   ├── pipelines/
│   └── courses/
└── components/
    └── (shared UI components)
```

---

