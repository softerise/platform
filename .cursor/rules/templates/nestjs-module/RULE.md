---
description: "NestJS Module Template – 8-File Scaffolding"
globs: []
alwaysApply: false
---

# TEMPLATE — NestJS Module (8-File Rule)

> Version: 1.1.0  
> Scope: Manual trigger only  
> Usage: `@nestjs-module` in chat

---

## 1. Template Usage Guardrail

This template provides **STRUCTURE**, not behavior.

Do NOT assume:
- CRUD endpoints are required
- Events must be emitted
- Repository must use Prisma directly
- All files must contain logic

**Fill only what is needed. Delete placeholder code if unused.**

---

## 2. When to Use

Use this template when creating a **new feature module** in `apps/api/src/modules/`.

Do NOT use for:
- `_core` module (infrastructure exception)
- Shared libraries
- Non-feature code

---

## 3. File Structure (Exact)

```
modules/{name}/
├── {name}.module.ts
├── {name}.controller.ts
├── {name}.service.ts
├── {name}.repository.ts
├── {name}.dto.ts
├── {name}.events.ts
├── {name}.spec.ts
└── MODULE.md
```

**8 files. No more. No less.**

---

## 4. File Skeletons

### {name}.module.ts
```typescript
import { Module } from '@nestjs/common'
import { {Name}Controller } from './{name}.controller'
import { {Name}Service } from './{name}.service'
import { {Name}Repository } from './{name}.repository'

@Module({
  controllers: [{Name}Controller],
  providers: [{Name}Service, {Name}Repository],
  exports: [{Name}Service],
})
export class {Name}Module {}
```

### {name}.controller.ts
```typescript
import { Controller } from '@nestjs/common'
import { {Name}Service } from './{name}.service'

@Controller('{names}')
export class {Name}Controller {
  constructor(private readonly service: {Name}Service) {}

  // Add endpoints as needed
}
```

### {name}.service.ts
```typescript
import { Injectable } from '@nestjs/common'
import { {Name}Repository } from './{name}.repository'

@Injectable()
export class {Name}Service {
  constructor(private readonly repository: {Name}Repository) {}

  // Add business logic as needed

  // Optional: inject EventEmitter2 and emit events if cross-module reaction needed
}
```

### {name}.repository.ts
```typescript
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../_core'

@Injectable()
export class {Name}Repository {
  constructor(private readonly prisma: PrismaService) {}

  // Add data access methods as needed
}
```

### {name}.dto.ts
```typescript
import { z } from 'zod'

// Add Zod schemas as needed

// Optional: define response interfaces if exposed via API
```

### {name}.events.ts
```typescript
// Define domain events only if cross-module communication is needed
// Do NOT create events "just in case"

// Example:
// export class {Name}CreatedEvent {
//   constructor(public readonly {name}: { id: string }) {}
// }
```

### {name}.spec.ts
```typescript
describe('{Name}Service', () => {
  it('should perform expected behavior', async () => {
    // TODO: implement tests for actual business logic
  })
})
```

### MODULE.md
```markdown
# {Name} Module

## Purpose
Brief description of what this module does.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| | | |

## Events Emitted
- None (or list if applicable)

## Events Handled
- None (or list if applicable)

## Business Rules
- 

## Edge Cases
- 
```

---

## 5. Naming Convention

| Element | Pattern | Example |
|---------|---------|---------|
| Folder | `kebab-case` | `user-profile` |
| Files | `{folder-name}.*.ts` | `user-profile.service.ts` |
| Class | `PascalCase` | `UserProfileService` |
| Endpoint | `kebab-case plural` | `/user-profiles` |

---

## 6. Checklist

Before completing module creation:

- [ ] Exactly 8 files created
- [ ] No subfolders
- [ ] MODULE.md filled with business context
- [ ] Unused placeholder code removed
- [ ] At least one meaningful test
- [ ] Module registered in app.module.ts

---

## 7. FORBIDDEN

| Action | Reason |
|--------|--------|
| Adding 9th file | 8-file rule |
| Creating subfolders | Flat structure |
| Skipping MODULE.md | LLM context required |
| Empty spec file | At least one test |
| Blind copy-paste of template logic | Fill only what's needed |
| Events "just in case" | Events only for cross-module |

---

**END OF TEMPLATE v1.1.0**