# INTEGRATIONS v1.0.0

```
══════════════════════════════════════════════════════════════════════════
CATALOG_VERSION: 1.0.0
LAST_UPDATED: 2024-01-18
STATUS: ACTIVE
INTEGRATION_COUNT: 0
══════════════════════════════════════════════════════════════════════════
```

---

## §0 CATALOG RULES

### Ne Zaman Eklenir

```
Bir entegrasyon şu durumlarda kataloga eklenir:
• Yeni third-party servis entegre edildiğinde
• API key / credential gerektiren servis eklendiğinde
• External API çağrısı yapıldığında
• SDK / client library kullanıldığında
```

### Entry Format

```
Her entegrasyon şu yapıda olmalı:

┌─────────────────────────────────────────────────────────────────────────┐
│ ID: INT-{CATEGORY}-{NUMBER}                                             │
│ SERVICE: {Servis adı}                                                   │
│ STATUS: 🟢 Active | 🟡 Partial | 🔴 Deprecated                          │
│ ADDED: YYYY-MM-DD                                                       │
│ UPDATED: YYYY-MM-DD                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ PURPOSE: {Ne için kullanılıyor}                                         │
│ PACKAGE: {npm package adı + versiyon}                                   │
│ DOCS: {Official documentation URL}                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ CREDENTIALS:                                                            │
│   • {ENV_VAR_NAME}: {Açıklama}                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ INITIALIZATION:                                                         │
│   {Kod örneği}                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ PATTERNS:                                                               │
│   ✅ {Doğru kullanım pattern'i}                                         │
│   ❌ {Yasak pattern}                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│ FILES:                                                                  │
│   • {İlgili dosya yolları}                                              │
├─────────────────────────────────────────────────────────────────────────┤
│ GOTCHAS:                                                                │
│   • {Bilinen sorunlar, dikkat edilecekler}                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Categories

```
AUTH      → Authentication (Firebase Auth, OAuth)
PAYMENT   → Payment processing (Stripe)
STORAGE   → File storage (Cloudflare R2, S3)
MESSAGING → Push & notifications (FCM, email)
CMS       → Content management (Sanity)
MONITOR   → Monitoring & tracking (Sentry, OpenTelemetry)
INFRA     → Infrastructure (Cloudflare, Render)
EXTERNAL  → Other external APIs
```

---

## §1 AUTHENTICATION

```
[Henüz entegrasyon yok]

Template:
──────────────────────────────────────────────────────────────────────────
ID: INT-AUTH-001
SERVICE: Firebase Authentication
STATUS: 🟢 Active
ADDED: YYYY-MM-DD
UPDATED: YYYY-MM-DD

PURPOSE: User authentication, session management, social login

PACKAGE: firebase-admin@^12.0.0

DOCS: https://firebase.google.com/docs/auth/admin

CREDENTIALS:
  • FIREBASE_PROJECT_ID: Firebase project identifier
  • FIREBASE_CLIENT_EMAIL: Service account email
  • FIREBASE_PRIVATE_KEY: Service account private key (base64)

INITIALIZATION:
  // packages/infra-firebase/src/firebase.service.ts
  import { initializeApp, cert } from 'firebase-admin/app';
  import { getAuth } from 'firebase-admin/auth';

  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString(),
    }),
  });

  export const auth = getAuth(app);

PATTERNS:
  ✅ Verify token in middleware/guard
  ✅ Use auth.verifyIdToken() for validation
  ✅ Cache decoded tokens (short TTL)
  ❌ Never trust client-side token claims without verification
  ❌ Never store raw tokens in database

FILES:
  • packages/infra-firebase/src/firebase.service.ts
  • packages/infra-firebase/src/auth.guard.ts
  • apps/api/src/auth/auth.module.ts

GOTCHAS:
  • Private key must be base64 encoded in env
  • Token expiry is 1 hour by default
  • Rate limits: 10 QPS for verifyIdToken
──────────────────────────────────────────────────────────────────────────
```

---

## §2 PAYMENT

```
[Henüz entegrasyon yok]

Template:
──────────────────────────────────────────────────────────────────────────
ID: INT-PAYMENT-001
SERVICE: Stripe
STATUS: 🟢 Active
ADDED: YYYY-MM-DD
UPDATED: YYYY-MM-DD

PURPOSE: Payment processing, subscriptions, invoicing

PACKAGE: stripe@^14.0.0

DOCS: https://stripe.com/docs/api

CREDENTIALS:
  • STRIPE_SECRET_KEY: API secret key (sk_live_* or sk_test_*)
  • STRIPE_WEBHOOK_SECRET: Webhook signing secret (whsec_*)
  • STRIPE_PUBLISHABLE_KEY: Public key for client (pk_*)

INITIALIZATION:
  // apps/api/src/payment/stripe.service.ts
  import Stripe from 'stripe';

  export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    typescript: true,
  });

PATTERNS:
  ✅ Always use webhook for payment confirmation
  ✅ Idempotency keys for create operations
  ✅ Store Stripe customer ID in User entity
  ❌ Never trust client-side payment confirmation
  ❌ Never log full card details

FILES:
  • apps/api/src/payment/stripe.service.ts
  • apps/api/src/payment/webhook.controller.ts
  • apps/api/src/payment/payment.module.ts

GOTCHAS:
  • Webhook signature verification is mandatory
  • Test mode vs Live mode keys
  • Handle async payment methods (3DS, bank transfers)
──────────────────────────────────────────────────────────────────────────
```

---

## §3 STORAGE

```
[Henüz entegrasyon yok]

Template:
──────────────────────────────────────────────────────────────────────────
ID: INT-STORAGE-001
SERVICE: Cloudflare R2
STATUS: 🟢 Active
ADDED: YYYY-MM-DD
UPDATED: YYYY-MM-DD

PURPOSE: File storage, image uploads, static assets

PACKAGE: @aws-sdk/client-s3@^3.0.0

DOCS: https://developers.cloudflare.com/r2/

CREDENTIALS:
  • R2_ACCOUNT_ID: Cloudflare account ID
  • R2_ACCESS_KEY_ID: R2 access key
  • R2_SECRET_ACCESS_KEY: R2 secret key
  • R2_BUCKET_NAME: Bucket name
  • R2_PUBLIC_URL: Public bucket URL

INITIALIZATION:
  // packages/infra-storage/src/r2.service.ts
  import { S3Client } from '@aws-sdk/client-s3';

  export const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

PATTERNS:
  ✅ Generate presigned URLs for uploads
  ✅ Use unique file names (UUID + original extension)
  ✅ Validate file type and size before upload
  ❌ Never expose bucket credentials to client
  ❌ Never allow arbitrary file extensions

FILES:
  • packages/infra-storage/src/r2.service.ts
  • apps/api/src/upload/upload.service.ts

GOTCHAS:
  • R2 uses S3-compatible API
  • No trailing slash in endpoint URL
  • Presigned URLs expire (default 1 hour)
──────────────────────────────────────────────────────────────────────────
```

---

## §4 MESSAGING

```
[Henüz entegrasyon yok]

Template for FCM:
──────────────────────────────────────────────────────────────────────────
ID: INT-MESSAGING-001
SERVICE: Firebase Cloud Messaging (FCM)
STATUS: 🟢 Active
...
──────────────────────────────────────────────────────────────────────────

Template for Email (Resend/SendGrid):
──────────────────────────────────────────────────────────────────────────
ID: INT-MESSAGING-002
SERVICE: Resend
STATUS: 🟢 Active
...
──────────────────────────────────────────────────────────────────────────
```

---

## §5 CMS

```
[Henüz entegrasyon yok]

Template:
──────────────────────────────────────────────────────────────────────────
ID: INT-CMS-001
SERVICE: Sanity
STATUS: 🟢 Active
ADDED: YYYY-MM-DD
UPDATED: YYYY-MM-DD

PURPOSE: Headless CMS for web app content

PACKAGE: @sanity/client@^6.0.0

DOCS: https://www.sanity.io/docs

CREDENTIALS:
  • SANITY_PROJECT_ID: Project identifier
  • SANITY_DATASET: Dataset name (production/development)
  • SANITY_API_TOKEN: API token (for mutations)

INITIALIZATION:
  // apps/web/src/lib/sanity.ts
  import { createClient } from '@sanity/client';

  export const sanityClient = createClient({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    apiVersion: '2024-01-01',
    useCdn: true,
  });

PATTERNS:
  ✅ Use GROQ for queries
  ✅ Enable CDN for read operations
  ✅ Use perspectives for preview mode
  ❌ Never expose write token to client
  ❌ Avoid fetching entire documents

FILES:
  • apps/web/src/lib/sanity.ts
  • apps/web/src/lib/queries.ts

GOTCHAS:
  • API version format: YYYY-MM-DD
  • CDN caches for ~60 seconds
  • Webhook for revalidation on publish
──────────────────────────────────────────────────────────────────────────
```

---

## §6 MONITORING

```
[Henüz entegrasyon yok]

Template:
──────────────────────────────────────────────────────────────────────────
ID: INT-MONITOR-001
SERVICE: Sentry
STATUS: 🟢 Active
ADDED: YYYY-MM-DD
UPDATED: YYYY-MM-DD

PURPOSE: Error tracking, performance monitoring

PACKAGE: @sentry/node@^7.0.0 (API), @sentry/react@^7.0.0 (Client)

DOCS: https://docs.sentry.io/

CREDENTIALS:
  • SENTRY_DSN: Data source name
  • SENTRY_AUTH_TOKEN: Release upload token
  • SENTRY_ORG: Organization slug
  • SENTRY_PROJECT: Project slug

INITIALIZATION:
  // apps/api/src/main.ts
  import * as Sentry from '@sentry/node';

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });

PATTERNS:
  ✅ Set user context on auth
  ✅ Add breadcrumbs for debugging
  ✅ Use transactions for performance
  ❌ Never log sensitive data (passwords, tokens)
  ❌ Don't set tracesSampleRate to 1.0 in production

FILES:
  • apps/api/src/main.ts
  • apps/client/src/main.tsx
  • apps/backoffice/src/main.tsx

GOTCHAS:
  • Source maps upload for readable stack traces
  • Rate limits on free tier
  • Filter PII before sending
──────────────────────────────────────────────────────────────────────────
```

---

## §7 INFRASTRUCTURE

```
[Henüz entegrasyon yok]

Template for Render:
──────────────────────────────────────────────────────────────────────────
ID: INT-INFRA-001
SERVICE: Render
STATUS: 🟢 Active
PURPOSE: API hosting, PostgreSQL, Redis (Valkey)
...
──────────────────────────────────────────────────────────────────────────

Template for Cloudflare:
──────────────────────────────────────────────────────────────────────────
ID: INT-INFRA-002
SERVICE: Cloudflare
STATUS: 🟢 Active
PURPOSE: DNS, CDN, DDoS protection
...
──────────────────────────────────────────────────────────────────────────
```

---

## §8 EXTERNAL APIs

```
[Henüz entegrasyon yok]

Buraya proje-specific external API'ler eklenir.
```

---

## §9 INTEGRATION INDEX

```
Hızlı arama için service → ID mapping

[Henüz entegrasyon yok]

Template:
┌─────────────────────────┬───────────────┬─────────────┬───────────────┐
│ Service                 │ ID            │ Category    │ Status        │
├─────────────────────────┼───────────────┼─────────────┼───────────────┤
│ Firebase Auth           │ INT-AUTH-001  │ AUTH        │ 🟢 Active     │
│ Stripe                  │ INT-PAYMENT-001│ PAYMENT    │ 🟢 Active     │
│ Cloudflare R2           │ INT-STORAGE-001│ STORAGE    │ 🟢 Active     │
│ FCM                     │ INT-MESSAGING-001│ MESSAGING│ 🟢 Active     │
│ Sanity                  │ INT-CMS-001   │ CMS         │ 🟢 Active     │
│ Sentry                  │ INT-MONITOR-001│ MONITOR    │ 🟢 Active     │
└─────────────────────────┴───────────────┴─────────────┴───────────────┘
```

---

## §10 CREDENTIAL CHECKLIST

```
Tüm entegrasyonların credential listesi (env vars)

[Henüz entegrasyon yok]

Template:
┌─────────────────────────────┬───────────────┬─────────────────────────┐
│ ENV Variable                │ Service       │ Required In             │
├─────────────────────────────┼───────────────┼─────────────────────────┤
│ FIREBASE_PROJECT_ID         │ Firebase      │ API                     │
│ FIREBASE_CLIENT_EMAIL       │ Firebase      │ API                     │
│ FIREBASE_PRIVATE_KEY        │ Firebase      │ API                     │
│ STRIPE_SECRET_KEY           │ Stripe        │ API                     │
│ STRIPE_WEBHOOK_SECRET       │ Stripe        │ API                     │
│ STRIPE_PUBLISHABLE_KEY      │ Stripe        │ Client, Backoffice      │
│ R2_ACCOUNT_ID               │ Cloudflare R2 │ API                     │
│ R2_ACCESS_KEY_ID            │ Cloudflare R2 │ API                     │
│ R2_SECRET_ACCESS_KEY        │ Cloudflare R2 │ API                     │
│ SANITY_PROJECT_ID           │ Sanity        │ Web                     │
│ SENTRY_DSN                  │ Sentry        │ API, Client, Backoffice │
└─────────────────────────────┴───────────────┴─────────────────────────┘
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
                      END OF INTEGRATIONS v1.0.0
══════════════════════════════════════════════════════════════════════════
LLM DIRECTIVE:
• Yeni entegrasyon eklendiğinde bu dökümanı güncelle
• Entegrasyon kodu yazarken bu dökümana başvur
• Credentials asla kod içinde hardcode edilmez
• Her entegrasyon için PATTERNS section'ı takip et
══════════════════════════════════════════════════════════════════════════
```