# Changelog

All notable changes to Spellpaw are documented here. Versions follow
[Semantic Versioning](https://semver.org/) with `v<MAJOR>.<MINOR>.<PATCH>-<phase>-<slug>`.

## v0.4.0-phase4-llm-capabilities — 2026-06-28

Phase 4: per-Capability LLM routing. Replaces per-provider API keys
(`spellpaw_settings.{openai,doubao,minimax}ApiKey`) with a single
`llmConfigs` object keyed by drama `Capability`.

### Highlights

- **9 capability cards** in console Integrations, each independently
  configurable: text2image, image2image, inpaint, text2video,
  image2video, styleTransfer, text2audio, text2model, image2model
- **ProviderSelect dropdown** primitive — single-select with
  recommended tag, keyboard nav, full ARIA, click-outside close
- **siliconflow** exposed for image workflows
- **openai** gains audio capability (TTS via `tts-1`)
- **Audio / 3D scaffolding** — UI in place, real provider pipeline
  for audio is future work
- **DB migrations** — replace 3 per-provider fields with `llmConfigs`
  JSON; drop legacy keys

### Breaking changes

- `spellpaw_settings.openaiApiKey`, `.doubaoApiKey`, `.minimaxApiKey`
  are gone from the schema. Users re-enter their keys under the new
  Integrations UI.
- `LlmConfigs` shape changed from `{ text, image, video }` (3 media
  buckets) to `Partial<Record<Capability, ModelConfig>>` (9 intent
  keys).

### Architecture

| Layer | Change |
|---|---|
| Shared types (`shared/lib/providers.ts`) | `Capability` (media bucket) gains `audio`, `model3d`; `openai.capabilities += 'audio'` |
| Drama types (`drama/lib/canvasToolkit/types.ts`) | `Capability` (drama intent) gains `text2audio`, `text2model`, `image2model` |
| Drama routing (`canvasToolkit/capabilityConfig.ts`) | Reads by `Capability`, not `MediaCapability`; no legacy fallback |
| Drama actions | `generateAsset`, `generateVariants`, `editAsset`, `applyStyle`, `batchApplyStyle` inject per-capability provider config |
| Console UI (`IntegrationsSection.tsx`) | One card per `Capability`; pill row replaced by `<ProviderSelect>` |
| Server (`server/src/routes/auth.ts`) | PATCH `/api/auth/settings` accepts partial `llmConfigs.{capability}` patches; merges with existing |
| Prisma | `User.llmConfigs` (JSON string) replaces `openaiApiKey`, `doubaoApiKey`, `minimaxApiKey`; migrations `20260628000000`, `20260628010000` |

### Migration guide

For users with existing settings:

1. Update the client (`npm install`).
2. Open console Integrations.
3. Re-enter API keys under the new 9-capability layout.
4. (Optional) Customize each capability with the most appropriate
   provider/model — e.g. text2image with doubao/seedream,
   image2image with siliconflow/FLUX.2-dev, styleTransfer with
   siliconflow/FLUX.2-pro.

### Tests

- **457 unit tests** passing across 54 test files
- **e2e/integrations-capabilities.spec.ts** — 4 browser tests
- **scripts/demo-recording.mjs** — Playwright script that records
  the full Integrations demo (video + screenshots + contact sheet)

### Post-release additions (in v0.4.0 tag, not yet cut as v0.4.1)

These two changes landed after the original v0.4.0 tag was cut on
2026-06-28. The tag on GitHub was force-pushed to include them;
a v0.4.1 tag will be cut when needed.

#### `3f4c5ea` — Per-user chat LLM via dedicated `chat` capability

Previously the Console Integrations page exposed 9 fine-grained
capability cards (text2image, image2image, ...) all feeding the
drama canvas toolkit's per-intent image/video/audio/3D routing.
The chat LLM that powers Copilot lived in an unused legacy 5-bucket
`text` slot in localStorage, never reached the server, and
defaulted to a DeepSeek key with no apiKey. The result: every user
who tried chat got a silent 400 from the Spellpaw server
("LLM_API_KEY not configured") regardless of what they configured
in Console.

This commit makes chat a first-class configurable capability:

- **Server**: `User.llmConfigs` JSON now includes `chat` alongside
  the 9-fine media keys. `ConfigCapability = 'chat' | 9-fine`.
  `parseLlmConfigs` reads/writes the chat key.
- **Client**: `LlmConfigs = Partial<Record<ConfigCapability, ModelConfig>>`
  — the 5-bucket legacy `text` slot is gone. `spellpawProvider.authHeaders`
  reads `settings.chat` (was `settings.text`).
- **UI**: A new "Copilot chat (LLM)" card appears first in
  Integrations, defaulting to DeepSeek. Renders identically to the
  9-fine cards.

#### `19dd24c` — `DEMO_LLM_*` env for seeding the demo account

The demo account (`demo@spellpaw.xyz` / `password123`) shipped
with no `llmConfigs` at all, so logging in and trying Copilot chat
failed with the server's 400 even after configuring the chat card
in Console. This commit seeds the demo user's chat LLM at
user-creation time from four new env vars:

- `DEMO_LLM_API_KEY` — required for chat to work; if unset the demo
  user still has the default DeepSeek config and must configure
  chat in Console.
- `DEMO_LLM_PROVIDER` (optional, default `deepseek`)
- `DEMO_LLM_BASE_URL` (optional, default provider's baseUrl)
- `DEMO_LLM_MODEL` (optional, default provider's recommended text model)

The seed runs only when the demo user is first created; existing
rows are left untouched (so re-deploys won't blow away a user-edited
config). `DEPLOY.md` updated to make `LLM_API_KEY` optional and
document the new `DEMO_LLM_*` block.

### Commits in this release

```
a59ab50 chore: add e2e demo recording script for Integrations page
9f6dfee feat(ui): replace provider pills with ProviderSelect dropdown
2099b2d feat: audio + 3D capability scaffolding (text2audio, text2model, image2model)
0cbb762 test(e2e): console Integrations per-Capability cards
4163014 feat: per-Capability LLM routing (text2image, image2image, inpaint, ...)
9f0eed9 refactor: complete capability-grouped LLM migration
541e24a feat(drama): route canvas card actions through capability config
a648342 feat(console): text/image/video capability-grouped integrations
fdd243c docs(spec): console text/image/video categories design
```

### Known limitations

- Drama canvas toolkit does not yet wire an `audio` generation
  pipeline. The `text2audio` capability is exposed in Integrations
  but not consumed by canvas actions.
- 3D (`text2model`, `image2model`) is UI scaffolding only. No
  provider supports `model3d` in the current registry.

### Updated test count

- **479 unit tests** passing across 56 files (1 skipped) — post
  the two post-release additions, the test suite grew by 22
  tests (e.g. 9-fine + chat round-trip, invalid-provider fallback,
  demo-user seed matrix).
- **491 unit tests** when including the server-side `seed.test.ts`
  suite (`npm --prefix server test`).