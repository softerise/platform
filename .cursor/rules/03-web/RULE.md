---
description: "Astro Web App – Static Site & CMS Boundaries"
globs:
  - "apps/web/**"
alwaysApply: false
---

# 03-WEB — Astro + Sanity Rules

> Version: 1.1.0  
> Scope: `apps/web/**`  
> Trigger: Glob-based

---

## 1. App Structure

```
apps/web/src/
├── pages/                   → File-based routing
├── layouts/                 → Page layouts
├── components/              → Astro/React components
├── content/                 → Content collections (if local)
├── lib/
│   └── sanity.ts            → Sanity client & queries
└── styles/
    └── global.css           → Global styles only
```

---

## 2. Rendering Decision (Strict)

| Content Type | Rendering | Reason |
|--------------|-----------|--------|
| Marketing pages | Static (SSG) | SEO, performance |
| Blog/Content | Static (SSG) | Cacheable |
| User-specific | SSR or Client | Dynamic data |

**Golden Rule: If content can be static, it MUST be static.**

---

## 3. Decision Bias Control

Do NOT add:
- Client-side logic for static content
- Hydration for cosmetic interactions
- CMS queries for data that never changes

Prefer:
- Build-time data
- Static props
- Plain HTML whenever possible

---

## 4. Sanity CMS Rules

All GROQ queries MUST live in `lib/sanity.ts`.

Queries inside components are FORBIDDEN.

**Content Boundaries:**
- Sanity = content storage only
- No business logic in Sanity schemas
- No application state in Sanity

---

## 5. Component Rules

### Island Architecture
- Default to zero JavaScript
- Use `client:*` directives only for interactive components
- Hydration for cosmetic effects is FORBIDDEN

### Component Location

| Type | Location |
|------|----------|
| Shared (cross-app) | `packages/ui` |
| Web-specific | `apps/web/src/components` |

Creating web-specific variants of shared components is FORBIDDEN.

---

## 6. Styling Rules

- Tailwind only
- Global CSS only in `styles/global.css`
- No CSS modules or styled-components

---

## 7. FORBIDDEN Patterns

| Pattern | Reason |
|---------|--------|
| GROQ queries in components | Centralize in lib/sanity.ts |
| SSR for static content | Use SSG |
| Unnecessary client:* hydration | Zero JS by default |
| Business logic in Sanity | CMS is content only |
| CSS modules / styled-components | Tailwind only |
| Duplicating packages/ui components | Reuse shared |
| Client-side routing | Use file-based |
| State management libraries | Not needed |

---

## 8. Quick Reference

| Question | Answer |
|----------|--------|
| Static or SSR? | Static unless user-specific |
| Where are Sanity queries? | `lib/sanity.ts` only |
| When to hydrate? | Only for interactivity |
| Where do components go? | `apps/web/src/components` |
| Shared components? | `packages/ui` |

---

**END OF WEB RULES v1.1.0**