# ERROR-CATALOG v1.0.0

```
══════════════════════════════════════════════════════════════════════════
CATALOG_VERSION: 1.0.0
LAST_UPDATED: 2024-01-18
STATUS: ACTIVE
ENTRY_COUNT: 0
══════════════════════════════════════════════════════════════════════════
```

---

## §0 CATALOG RULES

### Ne Zaman Eklenir

```
Bir hata şu durumlarda kataloga eklenir:
• Aynı hata 3+ kez karşılaşıldığında
• LLM aynı yanlış çözümü 2+ kez önerdiğinde
• Debugging'e 30+ dakika harcandığında
• Workaround gerektiren bilinen issue olduğunda
```

### Entry Format

```
Her entry şu yapıda olmalı:

┌─────────────────────────────────────────────────────────────────────────┐
│ ID: ERR-{CATEGORY}-{NUMBER}                                             │
│ SEVERITY: 🔴 Critical | 🟡 Warning | 🟢 Info                            │
│ ADDED: YYYY-MM-DD                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ ERROR: {Hata kodu veya mesajı}                                          │
│ CONTEXT: {Hangi durumda oluşur}                                         │
│ ROOT_CAUSE: {Neden oluşur}                                              │
│ SOLUTION: {Nasıl çözülür}                                               │
│ FILES: {İlgili dosyalar}                                                │
│ PREVENTION: {Nasıl önlenir}                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Categories

```
DB      → Database (Prisma, PostgreSQL)
API     → Backend (NestJS, validation)
CLIENT  → Frontend (React, Refine)
BUILD   → Build & tooling (Nx, TypeScript)
AUTH    → Authentication (Firebase, JWT)
QUEUE   → Events (BullMQ)
INFRA   → Infrastructure (Cloudflare, Render)
```

---

## §1 DATABASE ERRORS

```
[Henüz entry yok]

Template:
──────────────────────────────────────────────────────────────────────────
ID: ERR-DB-001
SEVERITY: 🔴 Critical
ADDED: YYYY-MM-DD

ERROR: Prisma P2002 - Unique constraint failed
CONTEXT: User creation with existing email
ROOT_CAUSE: Email uniqueness check missing before insert
SOLUTION: 
  1. Check existing record: prisma.user.findUnique({ where: { email } })
  2. Throw ConflictException if exists
FILES: apps/api/src/user/user.service.ts
PREVENTION: Always check unique fields before create operations
──────────────────────────────────────────────────────────────────────────
```

---

## §2 API ERRORS

```
[Henüz entry yok]
```

---

## §3 CLIENT ERRORS

```
[Henüz entry yok]
```

---

## §4 BUILD ERRORS

```
[Henüz entry yok]
```

---

## §5 AUTH ERRORS

```
[Henüz entry yok]
```

---

## §6 QUEUE ERRORS

```
[Henüz entry yok]
```

---

## §7 INFRA ERRORS

```
[Henüz entry yok]
```

---

## §8 ERROR INDEX

```
Hızlı arama için keyword → ID mapping

[Henüz entry yok]

Template:
┌─────────────────────────┬─────────────┬───────────────────┐
│ Keyword                 │ Error ID    │ Severity          │
├─────────────────────────┼─────────────┼───────────────────┤
│ P2002                   │ ERR-DB-001  │ 🔴                │
│ unique constraint       │ ERR-DB-001  │ 🔴                │
│ duplicate email         │ ERR-DB-001  │ 🔴                │
└─────────────────────────┴─────────────┴───────────────────┘
```

---

## VERSION HISTORY

```
v1.0.0 (2024-01-18)
└── Initial boilerplate created
```

---

```
══════════════════════════════════════════════════════════════════════════
                      END OF ERROR-CATALOG v1.0.0
══════════════════════════════════════════════════════════════════════════
LLM DIRECTIVE:
• Hata çözümünde önce bu katalogda ara
• Çözülen tekrarlayan hatalar buraya eklenmeli
• Katalogda varsa, katalog çözümünü uygula
══════════════════════════════════════════════════════════════════════════
```