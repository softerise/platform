# Final Monorepo Stratejisi v2.0

Geri bildirimleri entegre ettim. İşte güncellenmiş ve finalize edilmiş plan.

---

## Güncellenmiş Repo Yapısı

```
project-root/
├── apps/
│   ├── web/                      # Astro + Sanity
│   ├── backoffice/               # Vite + Refine + SHADCN
│   ├── client/                   # Vite + Refine + SHADCN
│   └── api/                      # NestJS
│
├── packages/
│   ├── contracts/                # Zod schemas (SOURCE OF TRUTH)
│   │   ├── src/
│   │   │   ├── entities/
│   │   │   │   ├── user.contract.ts
│   │   │   │   ├── booking.contract.ts
│   │   │   │   └── index.ts
│   │   │   ├── index.ts
│   │   │   └── shared/           # Shared primitives (Email, UUID, etc.)
│   │   └── README.md
│   │
│   ├── events/                   # Async event contracts (BullMQ, FCM)
│   │   ├── src/
│   │   │   ├── booking-created.event.ts
│   │   │   ├── user-verified.event.ts
│   │   │   ├── notification-send.event.ts
│   │   │   └── index.ts
│   │   └── README.md
│   │
│   ├── db-schema/                # Prisma schema + migrations
│   │   └── README.md             # ❌ Frontend ASLA import etmez
│   │
│   ├── api-dto/                  # GENERATED - Request/Response types
│   │   └── README.md             # ❌ Manuel edit YASAK
│   │
│   ├── api-client/               # GENERATED - OpenAPI client + hooks
│   │   └── README.md             # ❌ Manuel edit YASAK
│   │
│   ├── ui/                       # Shared components (ShadCN base)
│   │   └── README.md
│   │
│   ├── config-tailwind/          # Tailwind preset
│   ├── config-eslint/            # ESLint configs
│   ├── config-typescript/        # tsconfig bases
│   │
│   ├── infra-firebase/           # Firebase Admin SDK wrapper
│   │
│   └── utils/                    # Shared utilities
│
├── tooling/
│   ├── scripts/                  # Build, deploy, seed scripts
│   └── generators/               # Nx generators
│
├── .github/
│   └── workflows/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   └── llm-context/
│
├── nx.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Kritik Güncelleme 1: Generated Packages Kuralları

### packages/api-dto/README.md

```markdown
# @project/api-dto

## ⚠️ GENERATED PACKAGE - MANUEL EDİT YASAK

Bu paket `packages/contracts` içindeki Zod schema'larından
otomatik olarak generate edilir.

## Bu paketi KİM generate eder?

```bash
pnpm nx run api-dto:generate
```

## Bu paketi elle düzenleyebilir miyim?

**❌ HAYIR. ASLA.**

Elle yapılan her değişiklik bir sonraki generate işleminde kaybolur.

## Değişiklik yapmam gerekiyorsa?

1. `packages/contracts` içindeki ilgili schema'yı güncelle
2. `pnpm nx run api-dto:generate` komutunu çalıştır
3. Değişikliklerin yayılmasını bekle

## Generate Pipeline

```
contracts (Zod)
    ↓ generate
api-dto (TypeScript types)
    ↓ generate
OpenAPI spec
    ↓ generate
api-client
```
```

### packages/api-client/README.md

```markdown
# @project/api-client

## ⚠️ GENERATED PACKAGE - MANUEL EDİT YASAK

Bu paket OpenAPI spec'inden otomatik generate edilir.

## Generate komutu

```bash
pnpm nx run api-client:generate
```

## Ne içerir?

- HTTP client functions
- React Query hooks
- TypeScript types

## Elle düzenleme yapılabilir mi?

**❌ HAYIR. ASLA.**

## Custom hook eklemem gerekiyorsa?

`apps/client/src/hooks/` veya `apps/backoffice/src/hooks/` 
içinde wrapper hook oluştur.

```typescript
// ✅ DOĞRU: apps/client/src/hooks/useBookingWithExtra.ts
import { useBooking } from '@project/api-client';

export function useBookingWithExtra(id: string) {
  const query = useBooking(id);
  // Custom logic here
  return { ...query, extraField: computed };
}
```
```

---

## Kritik Güncelleme 2: Contracts UI Smell Koruması

### packages/contracts/README.md (Güncellenmiş)

```markdown
# @project/contracts

## Bu paket ne yapar?

Tüm domain entity'leri için Zod schema tanımları içerir.
Bu paket **Single Source of Truth**'tur.

## Bu paket ne YAPMAMALI?

- ❌ Business logic içermemeli
- ❌ Database specific field'lar içermemeli (createdAt, updatedAt hariç)
- ❌ UI specific validation mesajları içermemeli
- ❌ Hiçbir pakete depend etmemeli
- ❌ i18n keys içermemeli
- ❌ Form field labels içermemeli

## Validation Messages Kuralı

### ❌ YANLIŞ (contracts içinde)

```typescript
export const EmailSchema = z.string().email({
  message: 'Geçerli bir email adresi giriniz'  // ❌ UI concern
});
```

### ✅ DOĞRU (contracts içinde)

```typescript
export const EmailSchema = z.string().email();
```

### ✅ DOĞRU (UI layer'da)

```typescript
// apps/client/src/utils/validation-messages.ts
import { EmailSchema } from '@project/contracts';

export const EmailWithMessages = EmailSchema.refine(
  (val) => val.includes('@'),
  { message: t('validation.email.invalid') }
);
```

## Contract İçeriği Checklist

Yeni bir contract eklerken şunları kontrol et:

- [ ] Sadece shape ve type tanımlıyor mu?
- [ ] Validation message içermiyor mu?
- [ ] UI text içermiyor mu?
- [ ] Database-specific alan içermiyor mu?
- [ ] Başka bir package import etmiyor mu?
```

### packages/contracts/src/entities/user.contract.ts (Örnek)

```typescript
import { z } from 'zod';

// ============================================
// PRIMITIVE SCHEMAS (Reusable)
// ============================================

export const UserIdSchema = z.string().uuid();
export const EmailSchema = z.string().email();
export const UserRoleSchema = z.enum(['admin', 'user', 'guest']);

// ============================================
// ENTITY SCHEMAS
// ============================================

/**
 * Core User entity
 * 
 * ❌ DO NOT add UI validation messages here
 * ❌ DO NOT add i18n keys here
 * ❌ DO NOT add form labels here
 */
export const UserSchema = z.object({
  id: UserIdSchema,
  email: EmailSchema,
  role: UserRoleSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================
// DERIVED TYPES
// ============================================

export type UserId = z.infer<typeof UserIdSchema>;
export type Email = z.infer<typeof EmailSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type User = z.infer<typeof UserSchema>;

// ============================================
// PARTIAL / PICK SCHEMAS (for forms, updates)
// ============================================

export const UserCreateSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UserUpdateSchema = UserSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
```

---

## Kritik Güncelleme 3: Events Package (Async World)

### packages/events/README.md

```markdown
# @project/events

## Bu paket ne yapar?

Async event contract'larını tanımlar:
- BullMQ job payloads
- FCM notification payloads
- Analytics event payloads

## Bu paket ne YAPMAMALI?

- ❌ Event handler logic içermemeli
- ❌ Queue configuration içermemeli
- ❌ UI concern içermemeli

## Kullanım

### Event Tanımlama

```typescript
// packages/events/src/booking-created.event.ts
import { z } from 'zod';
import { BookingIdSchema, UserIdSchema } from '@project/contracts';

export const BookingCreatedEventSchema = z.object({
  type: z.literal('booking.created'),
  payload: z.object({
    bookingId: BookingIdSchema,
    userId: UserIdSchema,
    timestamp: z.date(),
  }),
  metadata: z.object({
    correlationId: z.string().uuid(),
    version: z.literal(1),
  }),
});

export type BookingCreatedEvent = z.infer<typeof BookingCreatedEventSchema>;
```

### Producer (API tarafında)

```typescript
// apps/api/src/booking/booking.service.ts
import { BookingCreatedEventSchema } from '@project/events';

async createBooking(data: BookingCreate) {
  const booking = await this.prisma.booking.create({ data });
  
  const event = BookingCreatedEventSchema.parse({
    type: 'booking.created',
    payload: {
      bookingId: booking.id,
      userId: booking.userId,
      timestamp: new Date(),
    },
    metadata: {
      correlationId: this.context.correlationId,
      version: 1,
    },
  });
  
  await this.queue.add('booking.created', event);
  
  return booking;
}
```

### Consumer (API tarafında)

```typescript
// apps/api/src/workers/booking.worker.ts
import { BookingCreatedEvent, BookingCreatedEventSchema } from '@project/events';

@Processor('booking')
export class BookingWorker {
  @Process('booking.created')
  async handleBookingCreated(job: Job<BookingCreatedEvent>) {
    const event = BookingCreatedEventSchema.parse(job.data);
    // Process event...
  }
}
```
```

### packages/events/src/booking-created.event.ts

```typescript
import { z } from 'zod';
import { BookingIdSchema, UserIdSchema } from '@project/contracts';

// ============================================
// EVENT SCHEMA
// ============================================

export const BOOKING_CREATED_EVENT = 'booking.created' as const;

export const BookingCreatedPayloadSchema = z.object({
  bookingId: BookingIdSchema,
  userId: UserIdSchema,
  totalAmount: z.number().positive(),
  currency: z.enum(['TRY', 'USD', 'EUR']),
  bookingDate: z.date(),
});

export const BookingCreatedMetadataSchema = z.object({
  correlationId: z.string().uuid(),
  timestamp: z.date(),
  version: z.literal(1),
  source: z.literal('api'),
});

export const BookingCreatedEventSchema = z.object({
  type: z.literal(BOOKING_CREATED_EVENT),
  payload: BookingCreatedPayloadSchema,
  metadata: BookingCreatedMetadataSchema,
});

// ============================================
// TYPES
// ============================================

export type BookingCreatedPayload = z.infer<typeof BookingCreatedPayloadSchema>;
export type BookingCreatedMetadata = z.infer<typeof BookingCreatedMetadataSchema>;
export type BookingCreatedEvent = z.infer<typeof BookingCreatedEventSchema>;

// ============================================
// FACTORY (for testing)
// ============================================

export function createBookingCreatedEvent(
  payload: BookingCreatedPayload,
  correlationId: string
): BookingCreatedEvent {
  return {
    type: BOOKING_CREATED_EVENT,
    payload,
    metadata: {
      correlationId,
      timestamp: new Date(),
      version: 1,
      source: 'api',
    },
  };
}
```

### packages/events/src/notification-send.event.ts

```typescript
import { z } from 'zod';
import { UserIdSchema } from '@project/contracts';

// ============================================
// NOTIFICATION EVENT SCHEMA
// ============================================

export const NOTIFICATION_SEND_EVENT = 'notification.send' as const;

export const NotificationChannelSchema = z.enum(['fcm', 'email', 'sms']);

export const NotificationSendPayloadSchema = z.object({
  userId: UserIdSchema,
  channel: NotificationChannelSchema,
  template: z.string(),
  data: z.record(z.string(), z.unknown()),
  
  // Channel-specific
  fcmToken: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const NotificationSendEventSchema = z.object({
  type: z.literal(NOTIFICATION_SEND_EVENT),
  payload: NotificationSendPayloadSchema,
  metadata: z.object({
    correlationId: z.string().uuid(),
    timestamp: z.date(),
    version: z.literal(1),
    source: z.enum(['api', 'worker']),
  }),
});

export type NotificationSendEvent = z.infer<typeof NotificationSendEventSchema>;
```

### packages/events/src/index.ts

```typescript
// Booking Events
export * from './booking-created.event';
export * from './booking-cancelled.event';
export * from './booking-completed.event';

// User Events
export * from './user-verified.event';
export * from './user-updated.event';

// Notification Events
export * from './notification-send.event';

// Analytics Events
export * from './analytics-track.event';

// ============================================
// EVENT REGISTRY (for type-safe handlers)
// ============================================

import { BookingCreatedEventSchema } from './booking-created.event';
import { UserVerifiedEventSchema } from './user-verified.event';
import { NotificationSendEventSchema } from './notification-send.event';

export const EventRegistry = {
  'booking.created': BookingCreatedEventSchema,
  'booking.cancelled': BookingCancelledEventSchema,
  'user.verified': UserVerifiedEventSchema,
  'notification.send': NotificationSendEventSchema,
} as const;

export type EventType = keyof typeof EventRegistry;
```

---

## Güncellenmiş Data Flow Diyagramı

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SOURCE OF TRUTH                                 │
│                                                                         │
│   ┌─────────────────────────┐     ┌─────────────────────────┐           │
│   │  packages/contracts     │     │  packages/events        │           │
│   │  ───────────────────    │     │  ──────────────────     │           │
│   │  • Entity schemas       │     │  • Async event schemas  │           │
│   │  • Domain types         │     │  • Job payloads         │           │
│   │  • Validation rules     │     │  • Notification types   │           │
│   └───────────┬─────────────┘     └───────────┬─────────────┘           │
│               │                               │                         │
└───────────────┼───────────────────────────────┼─────────────────────────┘
                │                               │
                ▼                               │
┌───────────────────────────────────────────────┼─────────────────────────┐
│              GENERATED ARTIFACTS              │                         │
│                                               │                         │
│   ┌─────────────────┐    ┌─────────────────┐  │                         │
│   │  api-dto        │    │  OpenAPI        │  │                         │
│   │  ❌ NO EDIT     │    │  spec.yaml      │  │                         │
│   └────────┬────────┘    └────────┬────────┘  │                         │
│            │                      │           │                         │
│            │                      ▼           │                         │
│            │             ┌─────────────────┐  │                         │
│            │             │  api-client     │  │                         │
│            │             │  ❌ NO EDIT     │  │                         │
│            │             └────────┬────────┘  │                         │
│            │                      │           │                         │
│            │             ┌─────────────────┐  │                         │
│            │             │  MSW Handlers   │  │                         │
│            │             │  ❌ NO EDIT     │  │                         │
│            │             └─────────────────┘  │                         │
│            │                                  │                         │
└────────────┼──────────────────────────────────┼─────────────────────────┘
             │                                  │
             ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           CONSUMERS                                     │
│                                                                         │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│   │  apps/api    │  │  apps/client │  │  apps/       │                  │
│   │              │  │              │  │  backoffice  │                  │
│   │  • Validation│  │  • API calls │  │  • API calls │                  │
│   │  • BullMQ    │  │  • Types     │  │  • Types     │                  │
│   │  • Events    │  │              │  │              │                  │
│   └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Güncellenmiş Package Boundaries

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         IMPORT RULES v2.0                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  contracts ──────► Herkes import edebilir                               │
│                                                                         │
│  events ─────────► SADECE api app + workers                             │
│                    ❌ Frontend YASAK                                    │
│                                                                         │
│  db-schema ──────► SADECE api app                                       │
│                    ❌ Frontend YASAK                                    │
│                                                                         │
│  api-dto ────────► api + client + backoffice                            │
│                    ❌ web app YASAK                                     │
│                    ⚠️  GENERATED - NO EDIT                              │
│                                                                         │
│  api-client ─────► client + backoffice                                  │
│                    ❌ api YASAK (circular)                              │
│                    ⚠️  GENERATED - NO EDIT                              │
│                                                                         │
│  ui ─────────────► client + backoffice                                  │
│                    ❌ api YASAK                                         │
│                                                                         │
│  infra-firebase ─► api + workers                                        │
│                    ❌ Frontend YASAK                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Güncellenmiş Nx ESLint Rules

```json
{
  "root": true,
  "plugins": ["@nx"],
  "overrides": [
    {
      "files": ["*.ts", "*.tsx"],
      "rules": {
        "@nx/enforce-module-boundaries": [
          "error",
          {
            "enforceBuildableLibDependsOnBuildableLib": true,
            "allow": [],
            "depConstraints": [
              {
                "sourceTag": "scope:api",
                "onlyDependOnLibsWithTags": [
                  "scope:shared",
                  "scope:contracts",
                  "scope:events",
                  "scope:db",
                  "scope:infra",
                  "scope:api-dto"
                ]
              },
              {
                "sourceTag": "scope:client",
                "onlyDependOnLibsWithTags": [
                  "scope:shared",
                  "scope:contracts",
                  "scope:api-client",
                  "scope:api-dto",
                  "scope:ui"
                ]
              },
              {
                "sourceTag": "scope:backoffice",
                "onlyDependOnLibsWithTags": [
                  "scope:shared",
                  "scope:contracts",
                  "scope:api-client",
                  "scope:api-dto",
                  "scope:ui"
                ]
              },
              {
                "sourceTag": "scope:web",
                "onlyDependOnLibsWithTags": [
                  "scope:shared",
                  "scope:contracts"
                ]
              },
              {
                "sourceTag": "scope:events",
                "onlyDependOnLibsWithTags": [
                  "scope:contracts"
                ]
              },
              {
                "sourceTag": "scope:db",
                "onlyDependOnLibsWithTags": ["scope:shared"]
              },
              {
                "sourceTag": "scope:contracts",
                "onlyDependOnLibsWithTags": []
              },
              {
                "sourceTag": "scope:infra",
                "onlyDependOnLibsWithTags": ["scope:shared", "scope:contracts"]
              },
              {
                "sourceTag": "type:generated",
                "bannedExternalImports": ["*"],
                "onlyDependOnLibsWithTags": ["scope:contracts"]
              }
            ]
          }
        ]
      }
    }
  ]
}
```

---

## Güncellenmiş LLM Context

### docs/llm-context/REFACTOR-CHECKLIST.md (v2.0)

```markdown
# Refactor Checklist v2.0

## ⚠️ GENERATED PACKAGES KURALI

Aşağıdaki paketler **ASLA manuel edit edilmez**:
- `packages/api-dto`
- `packages/api-client`

Bu paketlerde değişiklik gerekiyorsa:
1. `packages/contracts` içindeki source'u güncelle
2. Generate komutlarını çalıştır

---

## Contract Değişikliği Yapıldığında

Eğer `packages/contracts` içinde bir schema değiştirildiyse:

- [ ] Schema'da UI concern yok (validation message, i18n key)
- [ ] `pnpm nx run api-dto:generate` çalıştırıldı
- [ ] `pnpm nx run api-client:generate` çalıştırıldı
- [ ] `pnpm nx run msw:generate` çalıştırıldı
- [ ] `apps/api` validation güncellendi (otomatik)
- [ ] `apps/client` etkilenen componentler kontrol edildi
- [ ] `apps/backoffice` etkilenen componentler kontrol edildi
- [ ] İlgili testler çalıştırıldı

---

## Event Contract Değişikliği Yapıldığında

Eğer `packages/events` içinde bir event değiştirildiyse:

- [ ] Event versiyonu artırıldı (breaking change ise)
- [ ] Producer güncellendi (`apps/api`)
- [ ] Consumer güncellendi (workers)
- [ ] Dead letter handling kontrol edildi
- [ ] Integration test güncellendi

---

## Yeni Endpoint Eklendiğinde

- [ ] Contract tanımlandı (`packages/contracts`)
- [ ] `pnpm nx run api-dto:generate` çalıştırıldı
- [ ] API endpoint implemente edildi (`apps/api`)
- [ ] `pnpm nx run openapi:generate` çalıştırıldı
- [ ] `pnpm nx run api-client:generate` çalıştırıldı
- [ ] `pnpm nx run msw:generate` çalıştırıldı
- [ ] Integration test yazıldı
- [ ] E2E test yazıldı

---

## Yeni Async Event Eklendiğinde

- [ ] Event contract tanımlandı (`packages/events`)
- [ ] Producer implemente edildi
- [ ] Consumer (worker) implemente edildi
- [ ] Retry policy belirlendi
- [ ] Dead letter queue handling eklendi
- [ ] Integration test yazıldı

---

## Database Schema Değişikliği

- [ ] Prisma schema güncellendi
- [ ] Migration oluşturuldu (`pnpm nx run db-schema:migrate:dev`)
- [ ] Seed data güncellendi (gerekiyorsa)
- [ ] İlgili contract'lar senkronize edildi
- [ ] Generate pipeline çalıştırıldı

---

## Code Review Checklist

### Contracts Review
- [ ] UI concern içermiyor (validation message, label, i18n)
- [ ] Database-specific field içermiyor
- [ ] Başka package import etmiyor

### Generated Packages Review
- [ ] Manuel edit yapılmamış
- [ ] Generate komutu çalıştırılmış

### Events Review
- [ ] Version field mevcut
- [ ] Metadata (correlationId, timestamp) mevcut
- [ ] Backward compatible (veya version artırılmış)
```

---

## Package Tags (project.json)

```json
// packages/contracts/project.json
{
  "name": "contracts",
  "tags": ["scope:contracts", "type:source"]
}

// packages/events/project.json
{
  "name": "events",
  "tags": ["scope:events", "type:source"]
}

// packages/api-dto/project.json
{
  "name": "api-dto",
  "tags": ["scope:api-dto", "type:generated"]
}

// packages/api-client/project.json
{
  "name": "api-client",
  "tags": ["scope:api-client", "type:generated"]
}

// packages/db-schema/project.json
{
  "name": "db-schema",
  "tags": ["scope:db", "type:source"]
}

// apps/api/project.json
{
  "name": "api",
  "tags": ["scope:api", "type:app"]
}

// apps/client/project.json
{
  "name": "client",
  "tags": ["scope:client", "type:app"]
}
```

---

## Final Özet Tablosu

| Package | Type | Editable | Import Edebilen |
|---------|------|----------|-----------------|
| contracts | Source | ✅ Elle | Herkes |
| events | Source | ✅ Elle | API, Workers |
| db-schema | Source | ✅ Elle | Sadece API |
| api-dto | Generated | ❌ Yasak | API, Client, Backoffice |
| api-client | Generated | ❌ Yasak | Client, Backoffice |
| ui | Source | ✅ Elle | Client, Backoffice |
| infra-firebase | Source | ✅ Elle | API, Workers |
| utils | Source | ✅ Elle | Herkes |

---