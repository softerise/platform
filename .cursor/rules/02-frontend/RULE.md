---
description: "Refine.js Frontend Apps – UI Design System & Component Rules"
globs:
  - "apps/backoffice/**"
  - "apps/client/**"
alwaysApply: true
---

# 02-FRONTEND — Refine.js App Rules + Design System

> Version: 2.0.0  
> Scope: `apps/backoffice/**`, `apps/client/**`  
> Trigger: Glob-based (alwaysApply: true)

---

## 0. Design System Identity

This rulebook governs **all design UI code generation**.  
Conflicts with user expectations and prompts → **this rulebook wins**.

### Vizyon
**"Kurumsal, Minimal, Profesyonel"**

### Temel Prensipler
| Prensip | Açıklama |
|---------|----------|
| **Minimal** | Gereksiz dekorasyon yok, içerik ön planda |
| **Whitespace** | Bol boşluk kullan, sıkışık tasarımdan kaçın |
| **Hiyerarşi** | Net görsel hiyerarşi, max 3 tipografi seviyesi |
| **Tutarlılık** | Aynı pattern'ı tekrarla, her sayfa farklı görünmesin |
| **Border-Focused** | Shadow yerine border kullan |

### Tasarım Kararları
- **Mode:** Light only (dark mode yok)
- **Palet:** Monochrome + Single Accent
- **Radius:** Sharp/Corporate (max 8px)
- **Typography:** Inter font family
- **Shadows:** Kullanılmaz (hover micro-feedback hariç)

---

## 1. Color System

### Ana Palet
```
┌─────────────────────────────────────────────────────────────┐
│  TOKEN              │  HEX      │  KULLANIM                 │
├─────────────────────────────────────────────────────────────┤
│  --primary          │  #0A0A0A  │  Başlıklar, primary btn   │
│  --foreground       │  #171717  │  Body text                │
│  --muted-foreground │  #737373  │  Secondary text, hints    │
│  --accent           │  #2563EB  │  CTA, links, focus rings  │
│  --border           │  #E5E5E5  │  Borders, dividers        │
│  --background       │  #FAFAFA  │  Page background          │
│  --card             │  #FFFFFF  │  Card backgrounds         │
│  --muted            │  #F5F5F5  │  Muted backgrounds        │
└─────────────────────────────────────────────────────────────┘
```

### Semantic Colors
| Durum | Light BG | Text | Kullanım |
|-------|----------|------|----------|
| Success | `bg-success-light` | `text-success` | #DCFCE7 / #16A34A |
| Warning | `bg-warning-light` | `text-warning` | #FEF9C3 / #CA8A04 |
| Error | `bg-error-light` | `text-error` | #FEE2E2 / #DC2626 |
| Info | `bg-info-light` | `text-info` | #DBEAFE / #2563EB |

### ❌ Renk Yasakları
- Gradient kullanma
- Renkli background'lar kullanma (semantic hariç)
- Hardcoded hex values kullanma
- Primary ve accent'i aynı yerde kullanma

---

## 2. Typography

### Font Stack
```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

### Weight Kullanımı
| Weight | Değer | Kullanım |
|--------|-------|----------|
| Normal | 400 | Body text, paragraphs |
| Medium | 500 | Labels, buttons, card titles |
| Semibold | 600 | Page titles, section headers |

**KURAL:** Bir section'da max 2 farklı weight kullan.

### Size Hierarchy
```
Page Title    → text-2xl font-semibold tracking-tight
Section Title → text-lg font-semibold
Card Title    → text-base font-medium
Body          → text-sm (14px) - DEFAULT
Caption/Hint  → text-xs text-muted-foreground
```

### ❌ Tipografi Yasakları
- text-4xl'den büyük font kullanma
- 3'ten fazla font-weight kullanma
- Italic kullanma (medium weight tercih et)
- ALL CAPS kullanma (badge'ler hariç)

---

## 3. Spacing & Layout

### 4px Grid System
```
4px   → gap-1, p-1    (tight)
8px   → gap-2, p-2    (component içi - tight)
12px  → gap-3, p-3    (related items)
16px  → gap-4, p-4    (component içi - default)
24px  → gap-6, p-6    (card padding, section içi)
32px  → gap-8, p-8    (section arası)
48px  → gap-12        (major sections)
```

### Layout Defaults
| Element | Spacing |
|---------|---------|
| Page container | `max-w-7xl mx-auto px-6 py-8` |
| Page header to content | `mb-8` |
| Action bar to content | `mb-6` |
| Card padding | `p-6` |
| Form groups | `space-y-4` |
| Field group (label+input) | `space-y-2` |
| Table cell | `px-4 py-3` |
| Cards arası | `gap-6` |

### ❌ Spacing Yasakları
- 4px grid'den sapma (tüm değerler 4'ün katı)
- Sıkışık layout (min padding: 16px)
- Inline style ile spacing verme

---

## 4. Border & Radius

### Border Radius (Sharp/Corporate)
```
--radius-sm:  2px   → Küçük elementler, badges
--radius:     4px   → Default (buttons, inputs, cards)
--radius-md:  6px   → Medium cards
--radius-lg:  8px   → Large cards, modals
--radius-full       → Avatar, pills ONLY
```

### Border Usage
| Element | Class |
|---------|-------|
| Cards | `border border-border` |
| Inputs | `border border-input` |
| Focus state | `ring-2 ring-ring ring-offset-2` |
| Dividers | `border-b border-border` |
| Tables | `divide-y divide-border` |

### ❌ Border Yasakları
- Shadow kullanma (card'larda kesinlikle yasak)
- 8px'den büyük radius kullanma
- Colored borders kullanma (error state hariç)
- Double border kullanma

---

## 5. Component Patterns

### Buttons
```tsx
// Primary - Solid Black (DEFAULT)
<Button>Action</Button>

// Secondary - Outline
<Button variant="outline">Cancel</Button>

// Ghost - Text only
<Button variant="ghost">View</Button>

// Destructive - Red
<Button variant="destructive">Delete</Button>

// Accent - Royal Blue (CTA, özel durumlar)
<Button className="bg-accent text-accent-foreground hover:bg-accent/90">
  Get Started
</Button>
```

**Button Sizes:**
| Size | Height | Text | Padding |
|------|--------|------|---------|
| sm | 32px | text-xs | px-3 |
| default | 40px | text-sm | px-4 |
| lg | 48px | text-base | px-6 |

### Cards (Border Only - NO Shadow)
```tsx
<Card className="border border-border bg-card">
  <CardHeader className="pb-4">
    <CardTitle className="text-base font-medium">Title</CardTitle>
    <CardDescription className="text-sm text-muted-foreground">
      Description
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Tables (Corporate Style)
```tsx
<Table>
  <TableHeader className="bg-muted">
    <TableRow>
      <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Column
      </TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="border-b border-border hover:bg-muted/50">
      <TableCell className="text-sm">Content</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Forms
```tsx
// Field Group
<div className="space-y-2">
  <Label className="text-sm font-medium">Field Name</Label>
  <Input className="h-10" placeholder="Enter value..." />
  <p className="text-xs text-muted-foreground">Helper text here</p>
</div>

// Form Layout
<form className="space-y-4">
  {/* Field groups */}
</form>

// Error State
<div className="space-y-2">
  <Label className="text-sm font-medium">Email</Label>
  <Input className="h-10 border-destructive" />
  <p className="text-xs text-destructive">Email is required</p>
</div>
```

### Badges & Status
```tsx
// ALWAYS use StatusBadge for status display
<StatusBadge status="ACTIVE" />
<StatusBadge status="PENDING_VERIFICATION" />

// ALWAYS use RoleBadge for role display
<RoleBadge role="COMPANY_ADMIN" />
<RoleBadge role="SUPER_ADMIN" />

// Manual badge (only if absolutely necessary)
<Badge variant="outline" className="bg-success-light text-success border-0">
  Active
</Badge>
```

---

## 6. Page Structure

### Standard Page Layout
```tsx
<div className="mx-auto max-w-7xl px-6 py-8">
  {/* Page Header */}
  <div className="mb-8">
    <h1 className="text-2xl font-semibold tracking-tight">Page Title</h1>
    <p className="mt-1 text-sm text-muted-foreground">
      Optional description text
    </p>
  </div>
  
  {/* Actions Bar */}
  <div className="mb-6 flex items-center justify-between">
    <DataTableToolbar 
      searchValue={search}
      onSearchChange={setSearch}
      filters={...}
    />
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Add New
    </Button>
  </div>
  
  {/* Content Card */}
  <Card className="border border-border">
    <CardContent className="p-0">
      <Table>
        {/* Table content */}
      </Table>
    </CardContent>
  </Card>
</div>
```

### Empty State Pattern
```tsx
{data.length === 0 ? (
  <EmptyState
    icon={Users}
    title="No users found"
    description="Get started by inviting your first user."
    action={{
      label: "Invite User",
      onClick: () => navigate("/users/invite")
    }}
  />
) : (
  <Table>...</Table>
)}
```

---

## 7. App Structure
```
apps/{app-name}/src/
├── app/
│   ├── app.tsx              → Refine + Router setup
│   └── providers/           → Auth, Access Control, Data
├── layouts/                 → Main, Auth layouts
├── pages/{feature}/
│   ├── list.tsx
│   ├── show.tsx
│   ├── create.tsx
│   └── components/          → Page-specific only
├── components/              → App-wide only (Sidebar, UserMenu)
├── config/                  → App configuration
└── styles.css               → Import design system CSS
```

---

## 8. Component Hierarchy (Strict)

| Location | Scope | Rule |
|----------|-------|------|
| `packages/ui` | Cross-app shared | If used in 2+ apps → HERE |
| `apps/{app}/components` | App-wide | Sidebar, UserMenu, AppShell |
| `apps/{app}/pages/{feature}/components` | Page-specific | Feature filters, custom tables |

**Violation:** Duplicating a component that exists in `packages/ui`

---

## 9. Component Creation Guardrail

Do NOT create a new component if:
- It is used only once
- It wraps a single HTML element
- It only forwards props
- It can be achieved with Tailwind classes

**Prefer:** Inline JSX for simple UI, composition over abstraction.

---

## 10. Mandatory UI Components

From `@project/ui` - ALWAYS use these:

| Component | Purpose | Alternative |
|-----------|---------|-------------|
| `StatusBadge` | Status display | ❌ FORBIDDEN |
| `RoleBadge` | Role display | ❌ FORBIDDEN |
| `ConfirmDialog` | Destructive actions | ❌ FORBIDDEN |
| `EmptyState` | No data states | ❌ FORBIDDEN |
| `LoadingSkeleton` | Loading states | ❌ FORBIDDEN |
| `DataTableToolbar` | Search + filters | ❌ FORBIDDEN |

Hardcoding alternatives is **FORBIDDEN**.

---

## 11. Page State Handling (MANDATORY)

Every page MUST handle all states:
```tsx
function UserListPage() {
  const { data, isLoading, isError, error } = useTable<IUser>({...});

  // Loading State
  if (isLoading) {
    return <LoadingSkeleton variant="table" rows={5} />;
  }

  // Error State
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error?.message}</AlertDescription>
      </Alert>
    );
  }

  // Empty State
  if (!data?.data?.length) {
    return (
      <EmptyState
        icon={Users}
        title="No users yet"
        description="Invite your first team member."
        action={{ label: "Invite User", onClick: handleInvite }}
      />
    );
  }

  // Success State
  return <Table>...</Table>;
}
```

Rendering content without handling these states is **FORBIDDEN**.

---

## 12. Type Safety
```typescript
// ✅ ALWAYS import types from contracts
import type { 
  IUser, 
  UserStatus, 
  B2BRole,
  BackofficeRole,
  InviteStatus 
} from '@project/contracts';

// ❌ NEVER duplicate type definitions
type UserStatus = 'ACTIVE' | 'PENDING'; // FORBIDDEN
```

Duplicating type definitions is **FORBIDDEN**.

---

## 13. Import Patterns
```typescript
// UI Components (shadcn + custom)
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Label,
  Badge,
  Dialog,
  DropdownMenu,
} from '@project/ui';

// Custom Components
import {
  StatusBadge,
  RoleBadge,
  EmptyState,
  ConfirmDialog,
  DataTableToolbar,
  LoadingSkeleton,
} from '@project/ui';

// Utilities
import { cn } from '@project/ui';

// Design Tokens (if needed programmatically)
import { designTokens, colors } from '@project/ui';

// Types
import type { IUser, UserStatus, B2BRole } from '@project/contracts';

// Icons (Lucide - monochrome only)
import { Plus, Search, MoreHorizontal, Trash2 } from 'lucide-react';
```

---

## 14. Refine.js Rules

Use Refine-provided hooks - do NOT reimplement:
```typescript
// Data fetching
const { tableProps } = useTable<IUser>({...});
const { queryResult } = useShow<IUser>();
const { mutate } = useCreate();
const { mutate } = useUpdate();
const { mutate } = useDelete();

// Permissions
const { data: canEdit } = useCan({ action: "edit", resource: "users" });

// Navigation
const { push } = useNavigation();
```

**Provider locations:**
- `authProvider` → `app/providers/auth-provider.ts`
- `accessControlProvider` → `app/providers/access-control-provider.ts`
- `dataProvider` → `app/providers/data-provider.ts`

---

## 15. Styling Rules

| ✅ DO | ❌ DON'T |
|-------|----------|
| Tailwind classes only | CSS files |
| `cn()` for conditionals | Inline style objects |
| Design system tokens | Hardcoded values |
| Utility-first approach | Custom CSS |
```tsx
// ✅ Correct
<div className={cn(
  "flex items-center gap-4 p-4",
  isActive && "bg-muted"
)}>

// ❌ Wrong
<div style={{ display: 'flex', padding: '16px' }}>
```

---

## 16. Responsive Design

### Breakpoints
| Name | Width | Usage |
|------|-------|-------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |
| 2xl | 1400px | Container max |

### Patterns
```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Responsive visibility
<div className="hidden md:flex">

// Responsive spacing
<div className="px-4 md:px-6 lg:px-8">

// Responsive typography
<h1 className="text-xl md:text-2xl font-semibold">
```

---

## 17. Icon Usage
```tsx
// ALWAYS use Lucide icons
import { Plus, Search, MoreHorizontal, Trash2, Edit } from 'lucide-react';

// Standard sizes
<Icon className="h-4 w-4" />  // Default (16px)
<Icon className="h-5 w-5" />  // Medium (20px)
<Icon className="h-6 w-6" />  // Large (24px)

// In buttons
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Add New
</Button>

// Icon-only button
<Button variant="ghost" size="icon">
  <MoreHorizontal className="h-4 w-4" />
</Button>
```

**Icon Rules:**
- Monochrome only (inherits text color)
- No colored icons
- No animated icons
- Consistent sizing within context

---

## 18. Complexity Guardrail

Do NOT introduce:
- Global state if prop drilling is sufficient
- Custom hooks for one-time logic
- Component abstractions for single-use UI
- Context providers for simple data passing
- Redux/Zustand if Refine's state is enough

**Prefer:**
- Simpler prop passing
- Collocated state
- Composition over abstraction
- Refine's built-in state management

---

## 19. FORBIDDEN Patterns

| Pattern | Reason | Alternative |
|---------|--------|-------------|
| Hardcode status/role colors | Inconsistency | Use StatusBadge/RoleBadge |
| Skip loading/error/empty states | Bad UX | Always handle all states |
| Duplicate types | Maintenance | Import from @project/contracts |
| Inline confirmation dialogs | Inconsistency | Use ConfirmDialog |
| Skip permission checks | Security | Use useCan hook |
| Duplicate component from packages/ui | DRY violation | Import from @project/ui |
| Premature component abstraction | Complexity | Keep it simple |
| UI logic in providers | Separation | Providers are infra only |
| Shadow on cards | Design system | Use border only |
| Gradient backgrounds | Design system | Use solid colors |
| Custom fonts | Design system | Use Inter only |
| Colored icons | Design system | Monochrome only |
| Inline styles | Maintainability | Use Tailwind |
| CSS files | Consistency | Use Tailwind |

---

## 20. Quick Reference

| Question | Answer |
|----------|--------|
| Primary button style? | Solid black (`bg-primary`) |
| Card style? | Border only, no shadow |
| Border radius? | 4px default, max 8px |
| Font? | Inter |
| Accent color? | Royal Blue #2563EB |
| Where do shared components go? | `packages/ui` |
| Where do app-wide components go? | `apps/{app}/components` |
| Where do page components go? | `apps/{app}/pages/{feature}/components` |
| How to display status? | `<StatusBadge status={...} />` |
| How to handle delete? | `<ConfirmDialog ... />` |
| Where are types? | `@project/contracts` |
| Where is design system? | `packages/ui/src/design-system` |
| Should I create a new component? | Only if reused and non-trivial |

---

## 21. Reference Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Design Rules (Detailed) | `packages/ui/src/design-system/guidelines/DESIGN_RULES.md` | Full design specifications |
| Component Registry | `packages/ui/README.md` | Component catalog |
| Design Tokens | `packages/ui/src/design-system/tokens/` | Color, typography, spacing values |
| Global CSS | `packages/ui/src/design-system/styles/globals.css` | CSS variables |

**Priority:** If conflicts arise, **this RULE.md takes precedence** over README.md.

---

**END OF FRONTEND RULES v2.0.0**