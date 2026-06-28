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