# _core Module

## Amaç
Tüm feature modülleri tarafından kullanılan shared infrastructure servisleri, guards, decorators, pipes, filters ve strategies'i sağlar.

## ⚠️ İstisna Durumu
Bu modül **8-file kuralından muaftır**. Feature modülü değil, shared infrastructure modülüdür.

## Yapı
```
modules/_core/
├── _core.module.ts           # Global module registration
├── prisma/
│   └── prisma.service.ts     # Database connection & operations
├── queue/
│   └── queue.service.ts      # BullMQ job management
├── pipes/
│   └── zod.pipe.ts           # Zod validation pipe
├── filters/
│   ├── http-exception.filter.ts   # Global error handling
│   └── auth-exception.filter.ts   # Auth-specific errors
├── guards/
│   ├── firebase-auth.guard.ts     # Firebase token validation
│   ├── roles.guard.ts             # Role-based access control
│   └── rate-limit.guard.ts        # Request rate limiting
├── decorators/
│   ├── public.decorator.ts        # Mark route as public
│   ├── roles.decorator.ts         # Required roles
│   └── current-user.decorator.ts  # Extract current user
├── strategies/
│   └── firebase.strategy.ts       # Firebase auth strategy
├── events/
│   └── notification.event.ts      # Shared notification events
├── test/
│   └── helpers/
│       ├── auth.helper.ts         # Test auth utilities
│       └── db.helper.ts           # Test database utilities
└── index.ts                       # Public exports
```

## Exports

### Services
| Export | Açıklama |
|--------|----------|
| `PrismaService` | Database connection, extends PrismaClient |
| `QueueService` | BullMQ job queue management |

### Pipes
| Export | Açıklama |
|--------|----------|
| `ZodPipe` | Zod schema validation for DTOs |

### Filters
| Export | Açıklama |
|--------|----------|
| `HttpExceptionFilter` | Global HTTP exception handling |
| `AuthExceptionFilter` | 401/403 error handling |

### Guards
| Export | Açıklama |
|--------|----------|
| `FirebaseAuthGuard` | Firebase token validation |
| `RolesGuard` | Role-based access control |
| `RateLimitGuard` | Request throttling |

### Decorators
| Export | Açıklama |
|--------|----------|
| `@Public()` | Mark endpoint as public (no auth) |
| `@Roles(...roles)` | Require specific roles |
| `@CurrentUser()` | Extract authenticated user |
| `CurrentUserData` | Type for current user |

### Strategies
| Export | Açıklama |
|--------|----------|
| `FirebaseStrategy` | Firebase token validation logic |
| `FirebaseUser` | Firebase user type |

### Events
| Export | Açıklama |
|--------|----------|
| `NotificationSendEvent` | Cross-module notification event |

## Kullanım Örnekleri

### Controller'da Guard ve Decorator Kullanımı
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common'
import { Public, CurrentUser, Roles, ZodPipe, CurrentUserData } from '../_core'
import { CreateItemSchema } from './item.dto'

@Controller('items')
export class ItemController {
  @Public()
  @Get()
  findAll() {
    // Public endpoint - no auth required
  }

  @Get('me')
  findMine(@CurrentUser() user: CurrentUserData) {
    // user.uid, user.email available
  }

  @Roles('ADMIN')
  @Post()
  create(@Body(new ZodPipe(CreateItemSchema)) dto: CreateItemDto) {
    // Only ADMIN role can access
  }
}
```

### Service'de PrismaService Kullanımı
```typescript
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../_core'

@Injectable()
export class ItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.item.findMany({
      where: { deletedAt: null },
    })
  }
}
```

### Service'de QueueService Kullanımı
```typescript
import { Injectable } from '@nestjs/common'
import { QueueService } from '../_core'

@Injectable()
export class ItemService {
  constructor(private readonly queue: QueueService) {}

  async processAsync(data: any) {
    await this.queue.addJob('items', 'process', data, {
      delay: 5000,
      attempts: 3,
    })
  }
}
```

## Global Registration

`_core.module.ts` `@Global()` decorator ile işaretlenmiştir. Bu sayede diğer modüller import etmeden PrismaService ve QueueService'i inject edebilir.

```typescript
// AppModule'da bir kez import edilir
@Module({
  imports: [CoreModule, AuthModule, ...],
})
export class AppModule {}

// Diğer modüller doğrudan kullanabilir
@Injectable()
export class AnyService {
  constructor(private readonly prisma: PrismaService) {}
}
```

## Test Helpers

Test dosyalarında kullanılmak üzere helper fonksiyonlar:

```typescript
import { createTestUser, createAuthToken, cleanDatabase } from '../_core/test/helpers'

describe('[MyModule]', () => {
  beforeEach(async () => {
    await cleanDatabase(prisma)
  })

  it('test with auth', async () => {
    const user = await createTestUser({ role: 'ADMIN' })
    const token = await createAuthToken({ role: 'ADMIN' })
    // Use in tests
  })
})
```

## Dependencies
- `@prisma/client` - Database ORM
- `@nestjs/common` - NestJS core
- `@nestjs/core` - Reflector for guards
- `zod` - Schema validation

## Notes
- Bu modül **business logic içermez**
- Tüm servisler **stateless** olmalıdır
- Guards ve decorators **reusable** olmalıdır
- Feature-specific logic buraya **eklenmemelidir**

