# @project/ui - Design System & Component Library

> **LLM-FIRST DOCUMENTATION**  
> Bu döküman AI (Cursor/Claude) için single source of truth'dur.

---

## 🎨 DESIGN SYSTEM

### Vizyon
**"Kurumsal, Minimal, Profesyonel"**

### Temel Kararlar
| Karar | Değer |
|-------|-------|
| Mode | Light only |
| Palet | Monochrome + Royal Blue (#2563EB) |
| Font | Inter |
| Radius | Sharp (4px default, max 8px) |
| Shadows | Yok (border-focused) |
| Primary Button | Solid black |
| Cards | Border only |

### Dosya Yapısı
```
packages/ui/src/
├── design-system/
│   ├── tokens/
│   │   ├── colors.ts        # Renk token'ları
│   │   ├── typography.ts    # Font scale
│   │   ├── spacing.ts       # Spacing & layout
│   │   └── index.ts
│   ├── styles/
│   │   └── globals.css      # CSS Variables
│   ├── guidelines/
│   │   └── DESIGN_RULES.md  # AI kuralları (detaylı)
│   └── index.ts
├── lib/
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   └── [custom]/        # Custom components
│   └── utils.ts
└── index.ts
```

---

## 📋 QUICK REFERENCE

### Import Pattern
```tsx
// UI Components
import { 
  Button, Input, Label, Card, CardHeader, CardTitle, CardContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Dialog, DropdownMenu, Select, Badge, Tabs, Avatar,
} from '@project/ui';

// Custom Components
import { 
  StatusBadge, RoleBadge, EmptyState, ConfirmDialog,
  DataTableToolbar, LoadingSkeleton, FileDropzone,
} from '@project/ui';

// Utilities & Tokens
import { cn, designTokens } from '@project/ui';
```

---

## 🎨 COLOR PALETTE

### Primary (Monochrome)
| Token | Hex | Kullanım |
|-------|-----|----------|
| `primary` | #0A0A0A | Buttons, headings |
| `foreground` | #171717 | Body text |
| `muted-foreground` | #737373 | Secondary text |
| `border` | #E5E5E5 | Borders |
| `background` | #FAFAFA | Page bg |
| `card` | #FFFFFF | Card bg |

### Accent
| Token | Hex | Kullanım |
|-------|-----|----------|
| `accent` | #2563EB | CTA, links, focus |

### Semantic
| Status | Light BG | Text |
|--------|----------|------|
| Success | #DCFCE7 | #16A34A |
| Warning | #FEF9C3 | #CA8A04 |
| Error | #FEE2E2 | #DC2626 |
| Info | #DBEAFE | #2563EB |

---

## 📦 COMPONENT INDEX

### shadcn/ui Components
| Component | Purpose |
|-----------|---------|
| Button | Actions, CTAs |
| Input | Text input |
| Label | Form labels |
| Card | Content containers |
| Dialog | Modals |
| DropdownMenu | Action menus |
| Select | Dropdowns |
| Table | Data tables |
| Tabs | Tab navigation |
| Badge | Labels, tags |
| Avatar | User images |
| Checkbox | Boolean input |
| Textarea | Multi-line input |
| Tooltip | Hover info |
| Popover | Click info |
| Sheet | Side panels |
| Skeleton | Loading state |
| Separator | Dividers |
| Alert | Notifications |

### Custom Components
| Component | Purpose | Props |
|-----------|---------|-------|
| StatusBadge | User/Invite status | `status`, `size?` |
| RoleBadge | B2B/Admin roles | `role`, `size?` |
| EmptyState | No data states | `icon`, `title`, `description`, `action?` |
| ConfirmDialog | Destructive confirm | `open`, `onOpenChange`, `title`, `description`, `onConfirm`, `variant?` |
| DataTableToolbar | Search + filters | `searchValue`, `onSearchChange`, `filters?` |
| LoadingSkeleton | Loading placeholder | `variant`, `rows?` |
| ImpersonationBanner | Admin impersonation | `targetUser`, `onEndImpersonation` |
| FileDropzone | File upload | `accept?`, `maxSize?`, `onFileSelect` |

---

## 🔧 DESIGN TOKENS USAGE
```typescript
// Programmatic access (rare cases)
import { designTokens, colors, typography, spacing } from '@project/ui';

// Get color value
const primaryColor = colors.primary.DEFAULT; // '#0A0A0A'
const accentColor = colors.accent.DEFAULT;   // '#2563EB'
```

---

## ⚠️ RULES

### ✅ DO
- Use StatusBadge for all status displays
- Use RoleBadge for all role displays
- Use ConfirmDialog for destructive actions
- Use EmptyState for no data scenarios
- Import types from @project/contracts
- Use border-focused design (no shadows)
- Keep radius ≤ 8px

### ❌ DON'T
- Hardcode status/role colors
- Use shadows on cards
- Use gradients
- Use more than 2 font-weights per section

---

## 📚 DOCUMENTATION

| Document | Location |
|----------|----------|
| Design Rules | `packages/ui/src/design-system/guidelines/DESIGN_RULES.md` |
| Cursor Rules | `.cursor/rules/02-frontend/RULE.md` |
| Tokens | `packages/ui/src/design-system/tokens/` |
| CSS | `packages/ui/src/design-system/styles/globals.css` |

---

**END OF README**
