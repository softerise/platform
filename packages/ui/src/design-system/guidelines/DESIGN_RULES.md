# @project/ui Design System - AI Guidelines

> **Bu döküman AI (Cursor/Claude) için tasarım kurallarını tanımlar.**  
> Tüm UI geliştirmelerinde bu kurallara uyulmalıdır.

---

## 🎯 TASARIM PRENSİPLERİ

### Vizyon
**"Kurumsal, Minimal, Profesyonel"**

### Temel İlkeler
1. **Minimal** - Gereksiz dekorasyon yok, içerik ön planda
2. **Whitespace** - Bol boşluk kullan, sıkışık tasarımdan kaçın
3. **Hiyerarşi** - Net görsel hiyerarşi, max 3 tipografi seviyesi
4. **Tutarlılık** - Aynı pattern'ı tekrarla, her sayfa farklı görünmesin

---

## 🎨 RENK KULLANIMI

### Ana Palet
| Token | Hex | Kullanım |
|-------|-----|----------|
| `primary` | #0A0A0A | Başlıklar, primary buttons |
| `foreground` | #171717 | Body text |
| `muted-foreground` | #737373 | Secondary text, hints |
| `accent` | #2563EB | CTA buttons, links, focus rings |
| `border` | #E5E5E5 | Borders, dividers |
| `background` | #FAFAFA | Page background |
| `card` | #FFFFFF | Card backgrounds |

### Semantic Renkler
| Durum | Background | Text |
|-------|------------|------|
| Success | `bg-success-light` | `text-success` |
| Warning | `bg-warning-light` | `text-warning` |
| Error | `bg-error-light` | `text-error` |
| Info | `bg-info-light` | `text-info` |

### ❌ YAPMA
- Gradient kullanma
- Renkli background'lar kullanma (semantic hariç)
- Çok renkli ikonlar kullanma (monochrome tercih et)
- Primary ve accent'i aynı yerde kullanma

---

## 📝 TİPOGRAFİ

### Font
- **Family:** Inter
- **Weights:** Normal (400), Medium (500), Semibold (600)

### Hiyerarşi
```
Page Title    → text-2xl font-semibold  (24px, 600)
Section Title → text-lg font-semibold   (18px, 600)
Card Title    → text-base font-medium   (16px, 500)
Body          → text-sm                 (14px, 400)
Caption/Hint  → text-xs text-muted-foreground (12px, 400)
```

### ❌ YAPMA
- 3'ten fazla font-weight kullanma
- text-4xl'den büyük font kullanma
- Italic kullanma (emphasis için medium weight tercih et)
- ALL CAPS kullanma (badge'ler hariç)

---

## 📐 SPACING & LAYOUT

### Spacing Scale
```
4px  → gap-1, p-1   (tight spacing)
8px  → gap-2, p-2   (component içi)
12px → gap-3, p-3   (related items arası)
16px → gap-4, p-4   (component içi default)
24px → gap-6, p-6   (section içi, card padding)
32px → gap-8, p-8   (section arası)
48px → gap-12       (major sections)
```

### Layout Rules
- Page container: `max-w-7xl mx-auto px-6 py-8`
- Card padding: `p-6`
- Form groups: `space-y-4`
- Table cell padding: `px-4 py-3`

### ❌ YAPMA
- 4px grid'den sapma (tüm değerler 4'ün katı olmalı)
- Çok sıkışık layout (min padding: 16px)
- Inline style ile spacing verme

---

## 🔲 BORDER & RADIUS

### Border Radius (Sharp/Corporate)
```
--radius-sm: 2px   → Küçük elementler
--radius: 4px      → Default (buttons, inputs, cards)
--radius-md: 6px   → Medium cards
--radius-lg: 8px   → Large cards, modals
--radius-full      → Avatar, pills only
```

### Border Usage
- Cards: `border border-border` (1px solid #E5E5E5)
- Inputs: `border border-input` (1px solid #D4D4D4)
- Focus: `ring-2 ring-ring` (accent color)
- Dividers: `border-b border-border`

### ❌ YAPMA
- Shadow kullanma (hover states hariç)
- 8px'den büyük radius kullanma
- Double border kullanma
- Colored borders kullanma (error state hariç)

---

## 🔘 COMPONENT PATTERNS

### Buttons
```tsx
// Primary (Solid Black)
<Button>Action</Button>
// className: bg-primary text-primary-foreground

// Secondary (Outline)
<Button variant="outline">Cancel</Button>
// className: border border-input bg-background

// Accent (CTA - özel durumlar)
<Button variant="accent">Get Started</Button>
// className: bg-accent text-accent-foreground

// Destructive
<Button variant="destructive">Delete</Button>
```

**Sizes:**
- `sm`: height 32px, text-xs, px-3
- `default`: height 40px, text-sm, px-4
- `lg`: height 48px, text-base, px-6

### Cards
```tsx
// Standard Card (Border only, NO shadow)
<Card className="border border-border bg-card p-6">
  <CardHeader>
    <CardTitle className="text-base font-medium">Title</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

### Tables
```tsx
// Corporate Table Style
<Table>
  <TableHeader className="bg-muted">
    <TableRow>
      <TableHead className="text-muted-foreground font-medium">...</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="border-b border-border hover:bg-muted/50">
      <TableCell className="text-sm">...</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Forms
```tsx
// Form Group
<div className="space-y-2">
  <Label className="text-sm font-medium">Field Name</Label>
  <Input className="h-10" />
  <p className="text-xs text-muted-foreground">Helper text</p>
</div>

// Form Layout
<form className="space-y-4">
  {/* Form groups */}
</form>
```

### Badges/Status
```tsx
// Always use StatusBadge component
<StatusBadge status="ACTIVE" />

// Manual badge (if needed)
<Badge variant="outline" className="bg-success-light text-success">
  Active
</Badge>
```

---

## 📄 PAGE STRUCTURE

### Standard Page Layout
```tsx
<div className="page-container">
  {/* Header */}
  <div className="page-header">
    <h1 className="page-title">Page Title</h1>
    <p className="page-description">Optional description</p>
  </div>
  
  {/* Actions Bar (optional) */}
  <div className="mb-6 flex items-center justify-between">
    <DataTableToolbar ... />
    <Button>Add New</Button>
  </div>
  
  {/* Content */}
  <Card className="border border-border">
    {/* Table or Content */}
  </Card>
</div>
```

### Page Spacing
- Header to content: `mb-8`
- Action bar to content: `mb-6`
- Cards arası: `gap-6` veya `space-y-6`

---

## ✅ DO's & ❌ DON'Ts

### ✅ DO
- StatusBadge ve RoleBadge component'larını kullan
- ConfirmDialog ile destructive action'ları onayla
- EmptyState ile boş durumları göster
- Consistent spacing kullan (4px grid)
- Border-focused design (shadow değil)
- Monochrome icons (Lucide)

### ❌ DON'T
- Hardcoded color values kullanma
- Shadow kullanma (minimal hover effect hariç)
- Gradient kullanma
- 2'den fazla font-weight bir arada kullanma
- Inline styles kullanma
- Custom CSS yazmak yerine Tailwind kullan
- Colored/animated icons kullanma

---

## 🔗 IMPORT PATTERNS
```tsx
// UI Components
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Table,
  Input,
  Label,
  Badge,
} from '@project/ui';

// Custom Components
import {
  StatusBadge,
  RoleBadge,
  EmptyState,
  ConfirmDialog,
  DataTableToolbar,
} from '@project/ui';

// Utilities
import { cn } from '@project/ui';

// Types (from contracts)
import type { UserStatus, B2BRole } from '@project/contracts';
```

---

## 📱 RESPONSIVE RULES

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Patterns
```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Responsive padding
<div className="px-4 md:px-6 lg:px-8">

// Hide on mobile
<div className="hidden md:block">
```

---

**Bu kurallar tüm UI geliştirmelerinde referans alınmalıdır.**
