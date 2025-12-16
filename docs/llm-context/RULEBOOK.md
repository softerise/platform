# RULEBOOK v2.0.0

```
══════════════════════════════════════════════════════════════════════════
RULEBOOK_VERSION: 2.0.0
LAST_UPDATED: 2024-01-18
STATUS: ACTIVE
SCOPE: Daily Development - Single Source of Truth
TOKEN_BUDGET: ~3500
══════════════════════════════════════════════════════════════════════════
```

---

## §0 META RULES

### Rule Precedence

```
RULEBOOK > User Prompt

Çatışma durumunda:
1. RULEBOOK uygulanır
2. Aykırılık açıkça belirtilir
3. Doğru yaklaşım önerilir
```

### Refusal Conditions

```
LLM aşağıdaki durumlarda DURUR, kod üretmez:

❌ Import boundary ihlali
❌ Generated dosyaya manuel edit
❌ Contract içinde UI concern
❌ db-schema frontend erişimi
❌ any type kullanımı
❌ Circular dependency
❌ Yasak pattern talebi
❌ Hardcoded secret/credential

Refusal Response:
→ Kuralı belirt
→ Neden durduğunu açıkla
→ Doğru yaklaşımı öner
```

---

## §1 SOURCE OF TRUTH

### Data Flow

```
contracts (Zod) ─────► MUTLAK KAYNAK
       │
       ├──► api-dto (GENERATED)
       │
       ├──► OpenAPI spec (GENERATED)
       │         │
       │         └──► api-client (GENERATED)
       │
       └──► MSW handlers (GENERATED)
```

### Generated Packages

```
⛔ MANUEL EDİT YASAK:
• packages/api-dto
• packages/api-client  
• packages/msw-handlers

Değişiklik gerekiyorsa:
1. packages/contracts güncelle
2. pnpm nx run generate:all
```

### Package Boundaries

```
┌─────────────────┬─────────────────────────┬─────────────────┐
│ Package         │ ✅ Import Edebilen      │ ❌ Yasak        │
├─────────────────┼─────────────────────────┼─────────────────┤
│ contracts       │ Herkes                  │ -               │
│ events          │ API, Workers            │ Frontend        │
│ db-schema       │ Sadece API              │ Frontend        │
│ api-dto         │ API, Client, Backoffice │ Web             │
│ api-client      │ Client, Backoffice      │ API             │
│ ui              │ Client, Backoffice      │ API             │
│ infra-firebase  │ API, Workers            │ Frontend        │
│ utils           │ Herkes                  │ -               │
└─────────────────┴─────────────────────────┴─────────────────┘
```

---

## §2 TECH STACK PATTERNS

### NestJS (API)

```typescript
// ✅ Controller
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(dto);
  }
}

// ✅ Service
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }
}

// ❌ YASAK
@Controller('users')
export default class { }  // default export
async findOne(id: any) { } // any type
console.log(user);         // console.log
```

### Refine (Client/Backoffice)

```typescript
// ✅ List Page
export const UserList: React.FC = () => {
  const { tableProps } = useTable<User>({
    resource: "users",
    sorters: { initial: [{ field: "createdAt", order: "desc" }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="email" title="Email" />
        <Table.Column dataIndex="role" title="Role" />
      </Table>
    </List>
  );
};

// ✅ Form with Validation
export const UserCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm<User>({
    resource: "users",
    action: "create",
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Email" name="email" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Form>
    </Create>
  );
};

// ❌ YASAK
useEffect(() => { fetch('/api/users') }, []); // Direct fetch
const [users, setUsers] = useState([]);       // Manuel state
```

### React Components (UI)

```typescript
// ✅ Component Pattern
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant,
  size = 'md',
  children,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      className={cn(
        'rounded font-medium transition-colors',
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// ❌ YASAK
export default function Button() { }  // default export
const Button = (props: any) => { }    // any props
style={{ color: 'red' }}              // inline style
```

### Prisma (Database)

```typescript
// ✅ Query Pattern
const user = await prisma.user.findUnique({
  where: { id },
  include: { bookings: true },
});

// ✅ Transaction
const [user, booking] = await prisma.$transaction([
  prisma.user.create({ data: userData }),
  prisma.booking.create({ data: bookingData }),
]);

// ✅ Pagination (Cursor-based)
const users = await prisma.user.findMany({
  take: limit,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' },
});

// ❌ YASAK
prisma.user.findMany();              // Unbounded query
await prisma.$queryRaw`SELECT * ...` // Raw SQL (except complex cases)
```

### Zod (Contracts)

```typescript
// ✅ Contract Pattern
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

// ❌ YASAK
z.string().email({ message: 'Geçerli email girin' }); // UI message
z.object({ password: z.string() });                    // Sensitive field in contract
```

### BullMQ (Events)

```typescript
// ✅ Producer
await this.bookingQueue.add(
  'booking.created',
  BookingCreatedEventSchema.parse({
    type: 'booking.created',
    payload: { bookingId, userId },
    metadata: {
      correlationId: this.context.correlationId,
      timestamp: new Date(),
      version: 1,
    },
  }),
  {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  }
);

// ✅ Consumer
@Processor('booking')
export class BookingProcessor {
  @Process('booking.created')
  async handleCreated(job: Job<BookingCreatedEvent>) {
    const event = BookingCreatedEventSchema.parse(job.data);
    // Process...
  }
}

// ❌ YASAK
queue.add('event', { data: 'untyped' }); // Untyped payload
```

---

## §3 CODE STANDARDS

### Naming Conventions

```
Files:
├── {entity}.contract.ts        # Contracts
├── {entity}-{action}.event.ts  # Events
├── {entity}.controller.ts      # API Controllers
├── {entity}.service.ts         # API Services
├── {entity}.module.ts          # API Modules
├── {ComponentName}.tsx         # React Components
├── use{HookName}.ts            # React Hooks
├── {utilName}.util.ts          # Utilities
├── {filename}.spec.ts          # Unit Tests
└── {filename}.e2e-spec.ts      # E2E Tests

Variables:
• camelCase      → variables, functions
• PascalCase     → types, interfaces, classes, components
• UPPER_SNAKE    → constants, env vars
• kebab-case     → file names, URLs
```

### Code Patterns

```typescript
// ✅ Error Handling
async function fetchUser(id: string): Promise<Result<User, AppError>> {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return err(new NotFoundError('User', id));
    return ok(user);
  } catch (error) {
    return err(new DatabaseError(error));
  }
}

// ✅ Validation
const result = UserSchema.safeParse(data);
if (!result.success) {
  throw new ValidationError(result.error.flatten());
}

// ✅ Null Check
const user = await getUser(id);
if (!user) throw new NotFoundException();

// ✅ Early Return
function processOrder(order: Order) {
  if (!order.isValid) return;
  if (order.isPaid) return;
  // Process...
}
```

### Forbidden Patterns

```typescript
// ❌ YASAK PATTERNS

any                              // Type safety kaybı
@ts-ignore                       // Tip hatası gizleme
console.log()                    // Logger kullan
// @ts-nocheck                   // Dosya bazlı devre dışı
as unknown as Type               // Unsafe casting
!important                       // CSS override
innerHTML                        // XSS riski
eval()                           // Security riski
new Function()                   // Security riski
setTimeout(fn, 0)                // Workaround kokusu
// eslint-disable                // Kural devre dışı bırakma
magic numbers                    // Constants kullan
nested ternary (2+ level)        // Okunabilirlik
callback hell                    // async/await kullan
```

---

## §4 API CONVENTIONS

### REST Standards

```
Base:         /api/v1/{resource}
Versioning:   URL-based

Endpoints:
GET    /api/v1/users           # List
GET    /api/v1/users/:id       # Get one
POST   /api/v1/users           # Create
PATCH  /api/v1/users/:id       # Update
DELETE /api/v1/users/:id       # Delete

Nested:
GET    /api/v1/users/:id/bookings
```

### Request/Response

```typescript
// Pagination Request
GET /api/v1/users?cursor=xxx&limit=20&sort=createdAt:desc

// Success Response
{
  "data": { ... } | [ ... ],
  "meta": {
    "cursor": "next_cursor",
    "hasMore": true,
    "total": 100
  }
}

// Error Response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### HTTP Status Codes

```
200 OK              → Successful GET, PATCH
201 Created         → Successful POST
204 No Content      → Successful DELETE
400 Bad Request     → Malformed request
401 Unauthorized    → Missing/invalid auth
403 Forbidden       → Insufficient permissions
404 Not Found       → Resource not found
409 Conflict        → Duplicate resource
422 Unprocessable   → Validation error
429 Too Many        → Rate limited
500 Internal Error  → Server error
```

---

## §5 EVENT CONVENTIONS

### Event Structure

```typescript
// Event Naming: {domain}.{entity}.{action}
'booking.payment.completed'
'user.profile.updated'
'notification.email.sent'

// Event Schema
{
  type: 'booking.created',
  payload: {
    bookingId: 'uuid',
    userId: 'uuid',
    // Domain-specific data
  },
  metadata: {
    correlationId: 'uuid',    // Request trace
    timestamp: 'ISO8601',     // Event time
    version: 1,               // Schema version
    source: 'api'             // Origin service
  }
}
```

### Event Rules

```
✅ REQUIRED:
• Version field (breaking change tracking)
• CorrelationId (distributed tracing)
• Timestamp (ordering)
• Typed payload (Zod validated)

❌ FORBIDDEN:
• Sensitive data in payload (passwords, tokens)
• Large payloads (>1MB)
• Untyped events
```

---

## §6 TESTING STANDARDS

### Test Pyramid

```
        ╱╲
       ╱  ╲        E2E (10%)
      ╱────╲       Critical user flows
     ╱      ╲
    ╱        ╲     Integration (20%)
   ╱──────────╲    API, Database
  ╱            ╲
 ╱              ╲  Unit (70%)
╱────────────────╲ Functions, Components
```

### Test Patterns

```typescript
// ✅ Unit Test (Vitest)
describe('UserService', () => {
  describe('create', () => {
    it('should create user with valid data', async () => {
      const dto = { email: 'test@test.com', role: 'user' };
      const result = await service.create(dto);
      expect(result.email).toBe(dto.email);
    });

    it('should throw on duplicate email', async () => {
      await expect(service.create(existingUser))
        .rejects.toThrow(ConflictException);
    });
  });
});

// ✅ Integration Test (Supertest)
describe('POST /api/v1/users', () => {
  it('should return 201 on valid request', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .send({ email: 'test@test.com' })
      .expect(201);

    expect(response.body.data.id).toBeDefined();
  });
});

// ✅ E2E Test (Playwright)
test('user can complete booking flow', async ({ page }) => {
  await page.goto('/bookings/new');
  await page.fill('[name="date"]', '2024-02-01');
  await page.click('button[type="submit"]');
  await expect(page.locator('.success')).toBeVisible();
});
```

### Test Naming

```
Unit:        {file}.spec.ts
Integration: {file}.integration.spec.ts
E2E:         {flow}.e2e-spec.ts

Pattern: should {expected} when {condition}
```

### Mocking Strategy

```typescript
// API Mocking: MSW
export const handlers = [
  http.get('/api/v1/users', () => {
    return HttpResponse.json({ data: mockUsers });
  }),
];

// Database: Testcontainers
const container = await new PostgreSqlContainer().start();

// Time: Vitest
vi.useFakeTimers();
vi.setSystemTime(new Date('2024-01-01'));
```

---

## §7 CONTRACT RULES

### Contract Content

```
✅ CONTRACT İÇERİR:
• Shape (object structure)
• Type (primitives, enums)
• Invariant (min, max, pattern, format)

❌ CONTRACT İÇERMEZ:
• Validation messages
• i18n keys
• Form labels
• UI-specific logic
• Database-only fields
• Sensitive fields (password hash)
```

### Contract Example

```typescript
// ✅ DOĞRU
export const BookingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(['pending', 'confirmed', 'cancelled']),
  totalAmount: z.number().positive(),
  currency: z.enum(['TRY', 'USD', 'EUR']),
  startDate: z.date(),
  endDate: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Derived schemas
export const CreateBookingSchema = BookingSchema.omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.literal('pending').default('pending'),
});

export const UpdateBookingSchema = BookingSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Booking = z.infer<typeof BookingSchema>;
export type CreateBooking = z.infer<typeof CreateBookingSchema>;
export type UpdateBooking = z.infer<typeof UpdateBookingSchema>;
```

---

## §8 GLOSSARY

### Domain Terms

```
┌─────────────────┬─────────────────┬─────────────────────┐
│ Canonical       │ Aliases (YASAK) │ Açıklama            │
├─────────────────┼─────────────────┼─────────────────────┤
│ User            │ customer,client │ Sistem kullanıcısı  │
│ Booking         │ reservation     │ Rezervasyon         │
│ Payment         │ transaction     │ Ödeme işlemi        │
│ Notification    │ alert, message  │ Bildirim            │
└─────────────────┴─────────────────┴─────────────────────┘

Her zaman Canonical isim kullan.
```

### Technical Terms

```
DTO        → Data Transfer Object (API request/response)
Contract   → Zod schema (source of truth)
Entity     → Database model
Event      → Async message (BullMQ)
Handler    → Event processor
Hook       → React custom hook
```

---

## §9 CHECKLISTS

### New Endpoint

```
□ Contract tanımla (packages/contracts)
□ pnpm nx run generate:all
□ Controller oluştur
□ Service oluştur
□ Module'e register et
□ Unit test yaz
□ Integration test yaz
□ MSW handler kontrol et
```

### Contract Change

```
□ UI concern yok (message, label)
□ Breaking change? → Versiyon notu
□ pnpm nx run generate:all
□ API endpoint'ler güncellendi
□ Frontend component'ler güncellendi
□ Testler güncellendi
```

### Event Add

```
□ Event contract tanımla (packages/events)
□ Version: 1 ekle
□ Metadata structure ekle
□ Producer implementasyonu
□ Consumer implementasyonu
□ Retry policy belirle
□ Dead letter handling
□ Integration test yaz
```

### UI Component

```
□ Doğru lokasyon (ui vs app-specific)
□ Props interface tanımlı
□ Named export (default yok)
□ Tailwind classes (inline style yok)
□ Accessibility (aria)
□ Unit test
```

### Bug Fix

```
□ Bug reproduce edildi
□ Root cause belirlendi
□ Fix RULEBOOK'a uygun
□ Regression test eklendi
□ İlgili testler geçiyor
```

### Refactor

```
□ Davranış değişikliği yok
□ Import boundaries korunuyor
□ Generated dosyalara dokunulmadı
□ Tüm testler geçiyor
□ Type error yok
□ Lint error yok
```

---

## §10 QUICK REFERENCE

### Import Check

```typescript
// ✅ DOĞRU
import { UserSchema } from '@project/contracts';
import { useUser } from '@project/api-client';
import { Button } from '@project/ui';

// ❌ YANLIŞ
import { User } from '@project/db-schema';         // Frontend'de
import { prisma } from '@project/db-schema';       // Frontend'de
import { BookingEvent } from '@project/events';    // Frontend'de
```

### Type Check

```typescript
// ✅ DOĞRU
function getUser(id: string): Promise<User>
const users: User[] = []
interface Props { user: User }

// ❌ YANLIŞ
function getUser(id: any): any
const users = [] as any
interface Props { user: any }
```

### Generated File Check

```
Düzenlemek istediğin dosya bunlardan biri mi?
• packages/api-dto/*
• packages/api-client/*
• packages/msw-handlers/*

EVET → DURUR, contracts'ı güncelle
HAYIR → Devam et
```

---

## §11 ACTIVE CONTEXT

```
CURRENT_SPRINT: [Sprint adı girilecek]
CURRENT_FOCUS: [Ana feature girilecek]
CONTEXT_UPDATED: [Tarih girilecek]
```

### Aktif Çalışma

```
[Şu an üzerinde çalışılan feature/task buraya yazılacak]
```

### Bilinen Sorunlar

```
[Aktif bug'lar veya tech debt buraya yazılacak]
```

### Son Breaking Changes

```
[Son 2 hafta içindeki breaking change'ler buraya yazılacak]
```

### Geçici İstisnalar

```
[Varsa sprint bazlı kurallar buraya yazılacak]
```

---

## VERSION HISTORY

```
v2.0.0 (2024-01-18)
├── Unified single document
├── Tech stack patterns added
├── Code standards expanded
├── Testing strategy integrated
├── Glossary added
├── Token optimized (~3500)
└── Previous: v1.0.0

v1.0.0 (2024-01-18)
└── Initial release
```

---

```
══════════════════════════════════════════════════════════════════════════
                         END OF RULEBOOK v2.0.0
══════════════════════════════════════════════════════════════════════════
LLM DIRECTIVE: 
• Bu RULEBOOK her prompt'ta aktiftir
• Kural ihlali tespit edilirse DURDUR ve bildir
• User prompt çatışırsa RULEBOOK kazanır
• Şüphe durumunda RULEBOOK'a başvur
══════════════════════════════════════════════════════════════════════════
```