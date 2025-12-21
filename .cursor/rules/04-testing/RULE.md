---
description: "Test Strategy – Unified Test Files & Guardrails"
globs: []
alwaysApply: false
---

# 04-TESTING — Test Strategy Rules

> Version: 1.1.0  
> Scope: All apps  
> Trigger: Apply Intelligently (test context)

---

## 1. Golden Rule

**One module = One test file. Splitting tests is FORBIDDEN.**

```
modules/{name}/
└── {name}.spec.ts    → ALL tests (unit + integration + contract)
```

---

## 2. Test File Location

Test files are colocated with the code they test.

E2E tests live under `apps/{app}/tests/`.

---

## 3. Test Writing Guardrail

Do NOT write tests for:
- Trivial getters/setters
- Framework behavior
- One-line mappings
- Code without branching logic

Focus on:
- Business logic
- Edge cases
- Error handling
- Integration points

---

## 4. Backend Testing Rules

- Test against real database (Testcontainers)
- Do NOT mock Prisma in integration tests
- Mock only external services (APIs, queues)
- Use factory functions for test data

**Test data:**
- Use factories. Hardcoded fixtures are FORBIDDEN.

---

## 5. Frontend Testing Rules

- Test user behavior, not implementation
- Mock API calls with MSW
- Do NOT test internal component state
- Do NOT snapshot test (except for regression)

**API mocking:**
- Use MSW handlers in `apps/{app}/src/mocks/`
- Direct fetch/axios mocks are FORBIDDEN.

---

## 6. E2E Testing Rules

- Cover critical user flows only
- Do NOT duplicate unit/integration coverage

---

## 7. Coverage Rules

Coverage is a guideline, not a goal.

Focus on critical paths. Do NOT chase 100%.

---

## 8. Complexity Guardrail

Do NOT:
- Create test utilities unless reused 3+ times
- Abstract test setup excessively
- Mock what can be tested with real implementation

Prefer:
- Simple, readable tests
- Real dependencies over mocks
- Fewer, meaningful assertions

---

## 9. FORBIDDEN Patterns

| Pattern | Reason |
|---------|--------|
| Multiple test files per module | Unified spec rule |
| `__tests__/` directories | Colocate with source |
| Mocking Prisma in integration | Use Testcontainers |
| Mocking fetch/axios directly | Use MSW |
| Snapshot tests (default) | Only for regression |
| Testing implementation details | Test behavior |
| 100% coverage goal | Diminishing returns |
| Over-testing trivial logic | Adds noise, no confidence |

---

## 10. Quick Reference

| Question | Answer |
|----------|--------|
| How many test files per module? | Exactly 1 |
| Where do API tests go? | `{module}.spec.ts` |
| Where do component tests go? | `{component}.test.tsx` colocated |
| Where do E2E tests go? | `apps/{app}/tests/` |
| How to mock API in frontend? | MSW |
| How to mock DB in backend? | Testcontainers |
| Should I mock Prisma? | No |
| Should I test this getter? | No |

---

**END OF TESTING RULES v1.1.0**