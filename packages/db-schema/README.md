# @project/db-schema

Prisma schema ve migration'ları içerir. **Sadece API** tarafından tüketilir, frontend import etmez.

## Kurallar

- ❌ Frontend ASLA import etmez
- ✅ Prisma schema ve migration tek kaynaktır
- ✅ `DATABASE_URL` `.env` içinde tanımlı olmalı

## Komutlar

```bash
pnpm db:generate      # Prisma client üretir
pnpm db:migrate:dev   # Lokal migration
pnpm db:push          # Geliştirme şeması
```
