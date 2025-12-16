# @project/contracts

## Single Source of Truth

Zod şemalarıyla domain entity'lerini tanımlar. Bu paket **SOURCE OF TRUTH** ve herkes import edebilir.

## Ne YAPMAMALI?

- ❌ Business logic taşımaz
- ❌ Database specific field eklemez (createdAt/updatedAt haricinde)
- ❌ UI validation mesajı / i18n key / label içermez
- ❌ Başka pakete depend etmez

## Checklist

- [ ] Yalnızca shape & type tanımlar
- [ ] UI text içermez
- [ ] Database-specific alan eklemez
- [ ] Başka package import etmez

## Örnek Kullanım

```ts
import { BookingCreateSchema } from '@project/contracts';

const booking = BookingCreateSchema.parse(input);
```
