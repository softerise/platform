# @project/events

## Async Event Contract'ları

BullMQ job payloadları, FCM/email bildirimleri ve analytics event şekillerini Zod ile tanımlar.

## Ne YAPMAMALI?

- ❌ Event handler logic içermez
- ❌ Queue configuration içermez
- ❌ UI concern içermez

## Kapsam

- `scope:events` yalnızca API app + worker tarafından import edilir.

## Örnek

```ts
import { BookingCreatedEventSchema } from '@project/events';

const event = BookingCreatedEventSchema.parse(input);
```
