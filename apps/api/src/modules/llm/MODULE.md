# LLM Module

Infrastructure module providing unified LLM access with primary Claude (Sonnet 4) and fallback GPT-4, including retry + fallback logic and JSON validation.

## 8-File Structure
```
modules/llm/
├── llm.module.ts       → NestJS module definition (exports LlmService)
├── llm.controller.ts   → Placeholder (no HTTP surface, internal use)
├── llm.service.ts      → Orchestration, retries, fallback, validation
├── llm.repository.ts   → Provider adapters (Claude, GPT-4)
├── llm.dto.ts          → Zod schemas, types, LlmError
├── llm.events.ts       → LLM-related events (future use)
├── llm.spec.ts         → Tests placeholder (Phase 3)
└── MODULE.md           → This file
```

## Providers & Defaults
- Primary: Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- Fallback: GPT-4 (`gpt-4`)
- Env:
  - `ANTHROPIC_API_KEY`
  - `OPENAI_API_KEY`
  - `LLM_PRIMARY_PROVIDER` (claude|gpt4, default claude)
  - `LLM_MAX_RETRIES` (default 2, per provider)
  - `LLM_TIMEOUT_MS` (default 60000)

## Behavior
- DR-14: Try primary → retry (exp backoff 1s/2s/4s) on retriable → fallback to secondary on failure.
- DR-15: JSON parse validation (`responseFormat=json`); retry up to 2x on LLM-004 before marking failed.
- Error taxonomy: LLM-001 timeout, LLM-002 rate limit, LLM-003 API error, LLM-004 invalid response.
- No streaming, no token/cost tracking (per blueprint scope).

## Usage
Inject `LlmService` and call:
```
const result = await llmService.complete({
  prompt,
  systemPrompt,
  responseFormat: 'json', // optional
});
```

## Notes
- Logging uses NestJS Logger only.
- No database interactions.
- Controller kept minimal to satisfy 8-file rule; module is infrastructure-only.

