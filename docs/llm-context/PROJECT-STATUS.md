# Install
pnpm install

# Development
pnpm nx serve api              # API        → http://localhost:3000
pnpm nx run client:dev         # Client     → http://localhost:4300
pnpm nx run backoffice:dev     # Backoffice → http://localhost:4200
pnpm nx run web:dev            # Web/Astro  → http://localhost:4321

# Testing
pnpm nx run @project/contracts:test -- --run
pnpm nx run @project/events:test -- --run
pnpm nx run @project/utils:test -- --run
pnpm nx run api:test

# Generate (after contract changes)
pnpm nx run generate:all

# Build
pnpm nx run-many -t build

# Lint
pnpm nx run-many -t lint
```

### Ports
```
┌─────────────────┬────────┬─────────────────────────────┐
│ App             │ Port   │ URL                         │
├─────────────────┼────────┼─────────────────────────────┤
│ API             │ 3000   │ http://localhost:3000       │
│ Client          │ 4300   │ http://localhost:4300       │
│ Backoffice      │ 4200   │ http://localhost:4200       │
│ Web (Astro)     │ 4321   │ http://localhost:4321       │
│ PostgreSQL      │ 5432   │ localhost:5432              │
│ Redis           │ 6379   │ localhost:6379              │
└─────────────────┴────────┴─────────────────────────────┘
```

---

## §2 ENVIRONMENT

### Database
```
Development:  SQLite (default)
              Path: packages/db-schema/prisma/dev.db
              Auto-generated, no setup needed

Production:   PostgreSQL
              Override: DATABASE_URL env var
```

### Queue (BullMQ)
```
Development:  No-op mode (logs only)
              Queue işlemleri loglanır, Redis gerekmez

Production:   Redis required
              Set: REDIS_HOST, REDIS_PORT
```

### Required ENV Variables
```
┌─────────────────────────┬─────────────┬─────────────────────────────────┐
│ Variable                │ Required    │ Default / Notes                 │
├─────────────────────────┼─────────────┼─────────────────────────────────┤
│ DATABASE_URL            │ Production  │ SQLite in dev                   │
│ REDIS_HOST              │ Production  │ No-op in dev                    │
│ REDIS_PORT              │ Production  │ 6379                            │
│ VITE_API_URL            │ Frontend    │ http://localhost:3000/api       │
│ NODE_ENV                │ All         │ development                     │
└─────────────────────────┴─────────────┴─────────────────────────────────┘
```

---

## §3 PROJECT STRUCTURE

### Apps Status
```
┌─────────────────┬────────────┬─────────────────────────────────────────┐
│ App             │ Status     │ Notes                                   │
├─────────────────┼────────────┼─────────────────────────────────────────┤
│ apps/api        │ 🟢 Active  │ NestJS, basic scaffold                  │
│ apps/client     │ 🟡 Scaffold│ Vite + Refine, placeholder              │
│ apps/backoffice │ 🟡 Scaffold│ Vite + Refine, placeholder              │
│ apps/web        │ 🟡 Scaffold│ Astro, placeholder                      │
└─────────────────┴────────────┴─────────────────────────────────────────┘

Status Legend:
🟢 Active     → Çalışıyor, geliştirmeye hazır
🟡 Scaffold   → Temel yapı var, içerik eksik
🔴 Broken     → Çalışmıyor, fix gerekli
⚪ Planned    → Henüz oluşturulmadı
```

### Packages Status
```
┌─────────────────────────┬────────────┬───────────────────────────────────┐
│ Package                 │ Status     │ Notes                             │
├─────────────────────────┼────────────┼───────────────────────────────────┤
│ packages/contracts      │ 🟢 Active  │ Zod schemas, source of truth      │
│ packages/events         │ 🟢 Active  │ Event contracts                   │
│ packages/db-schema      │ 🟢 Active  │ Prisma schema                     │
│ packages/api-dto        │ 🟡 Generated│ Placeholder, auto-generated      │
│ packages/api-client     │ 🟡 Generated│ Placeholder, auto-generated      │
│ packages/ui             │ 🟡 Scaffold│ ShadCN base, needs components     │
│ packages/utils          │ 🟢 Active  │ Shared utilities                  │
│ packages/config-*       │ 🟢 Active  │ Shared configs                    │
│ packages/infra-firebase │ ⚪ Planned │ Not yet created                   │
└─────────────────────────┴────────────┴───────────────────────────────────┘
```

### Entities Status
```
┌─────────────────┬────────────┬──────────┬──────────┬──────────┐
│ Entity          │ Contract   │ DB Model │ API CRUD │ UI       │
├─────────────────┼────────────┼──────────┼──────────┼──────────┤
│ User            │ ⚪ Planned │ ⚪       │ ⚪       │ ⚪       │
│ Booking         │ ⚪ Planned │ ⚪       │ ⚪       │ ⚪       │
│ Payment         │ ⚪ Planned │ ⚪       │ ⚪       │ ⚪       │
│ Notification    │ ⚪ Planned │ ⚪       │ ⚪       │ ⚪       │
└─────────────────┴────────────┴──────────┴──────────┴──────────┘

Legend:
🟢 Done    → Tamamlandı
🟡 Partial → Kısmen tamamlandı
⚪ Planned → Henüz başlanmadı
```

---

## §4 KNOWN ISSUES

### Active Issues
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ID: ISS-001                                                             │
│ SEVERITY: 🟡 Warning                                                    │
│ AREA: Build                                                             │
│ ADDED: 2024-01-18                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ ISSUE: Astro plugin (@nxtensions/astro) peer warning with Nx 22         │
│ IMPACT: Warning only, build works                                       │
│ WORKAROUND: Ignore warning                                              │
│ FIX: Upgrade alignment when plugin updates                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ID: ISS-002                                                             │
│ SEVERITY: 🟡 Warning                                                    │
│ AREA: API                                                               │
│ ADDED: 2024-01-18                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ ISSUE: AppController uses manual service instantiation                  │
│ IMPACT: Tests pass but not proper DI                                    │
│ WORKAROUND: Manual instantiation in controller                          │
│ FIX: Revisit DI wiring when adding more modules                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ID: ISS-003                                                             │
│ SEVERITY: 🟢 Info                                                       │
│ AREA: Testing                                                           │
│ ADDED: 2024-01-18                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ ISSUE: Frontend e2e suites not yet executed                             │
│ IMPACT: No e2e coverage for client/backoffice                           │
│ WORKAROUND: N/A                                                         │
│ FIX: Setup Playwright and run e2e after UI implementation               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Resolved Issues
```
[Henüz çözülen issue yok]

Template:
──────────────────────────────────────────────────────────────────────────
ID: ISS-XXX (RESOLVED)
RESOLVED: 2024-XX-XX
RESOLUTION: [Ne yapıldı]
──────────────────────────────────────────────────────────────────────────
```

---

## §5 CURRENT SPRINT
```
SPRINT: Initial Setup
STARTED: 2024-01-18
FOCUS: Monorepo scaffold & base infrastructure
```

### Completed
```
✅ Nx workspace initialized
✅ Core packages created (contracts, events, utils, db-schema)
✅ API app scaffold (NestJS)
✅ Client app scaffold (Vite + Refine)
✅ Backoffice app scaffold (Vite + Refine)
✅ Web app scaffold (Astro)
✅ Base configurations (ESLint, TypeScript, Tailwind)
✅ Test setup (Vitest)
```

### In Progress
```
🔄 [Aktif çalışmalar buraya]
```

### Next Up
```
⏳ User entity (contract + db + api + ui)
⏳ Auth integration (Firebase)
⏳ API client generation pipeline
⏳ E2E test setup (Playwright)
```

---

## §6 DEPENDENCIES

### Key Versions
```
┌─────────────────────────┬─────────────┬─────────────────────────────────┐
│ Package                 │ Version     │ Notes                           │
├─────────────────────────┼─────────────┼─────────────────────────────────┤
│ Node.js                 │ 20.x        │ LTS                             │
│ pnpm                    │ 8.x         │ Package manager                 │
│ Nx                      │ 22.x        │ Monorepo tooling                │
│ TypeScript              │ 5.x         │                                 │
│ NestJS                  │ 10.x        │ API framework                   │
│ Prisma                  │ 5.x         │ ORM                             │
│ Zod                     │ 3.x         │ Validation                      │
│ React                   │ 18.x        │ UI library                      │
│ Refine                  │ 4.x         │ Admin framework                 │
│ Astro                   │ 4.x         │ Web framework                   │
│ Tailwind                │ 3.x         │ CSS                             │
│ Vitest                  │ 1.x         │ Testing                         │
└─────────────────────────┴─────────────┴─────────────────────────────────┘
```

---

## §7 NOTES

### Dev Tips
```
- SQLite dev DB auto-creates, no manual setup needed
- Redis optional in dev, queue logs to console
- Run `pnpm nx graph` to visualize dependencies
- Run `pnpm nx affected -t test` for changed packages only
```

### Conventions Reminder
```
- Generated packages (api-dto, api-client): NO MANUAL EDIT
- Contract changes: Always run generate:all after
- New entity: Follow RULEBOOK checklist
```

---

## VERSION HISTORY
```
v1.0.0 (2024-01-18)
└── Initial status documented
    • Base scaffold complete
    • Known issues logged
    • Environment documented
```

---
```
══════════════════════════════════════════════════════════════════════════
                      END OF PROJECT-STATUS v1.0.0
══════════════════════════════════════════════════════════════════════════
LLM DIRECTIVE:
- Her session başında bu dökümanı oku
- Task tamamlandığında güncelle
- Status değişikliklerini logla
- Known issues ekle/çöz
══════════════════════════════════════════════════════════════════════════