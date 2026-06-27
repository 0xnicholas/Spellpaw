# Image Generation Prompt Specification

For character costume three-view image prompts. Read when generating prompts for CharacterCostumeCard. Do not copy the full specification into the card.

## Core Principles

### 1. Must Reference Upstream Cards

Before generating prompts, read:
- **Art Direction Card**: visual style, color scheme, material requirements, lighting parameters
- **Character Asset Card**: character info, aura characteristics, costume requirements
- **Existing successful prompts**: use as templates; replace only character-specific info

### 2. Complete Prompt Template

Standard prompts must include:

```markdown
[Opening] Professional Character Design Sheet, purpose, style and reference works
[Layout] Left 40% three-views | Center 10% clean headshot | Right top 25% 5 expressions (2 rows×3) | Right mid 15% 4 actions | Right bottom 10% 4 detail close-ups
[Character] Name, age, gender, ethnicity, height, build, facial features, hairstyle, makeup, clothing, accessories, overall aura
[Style] Cite art direction: specific color palette ratios, material texture, lighting (color temp, contrast, light-dark ratio), explicit style name
[Technical] 16:9 | #FFFFFF background | full character visible | orthographic three-view | 4K 3840×2160 | no logos/watermarks
[Reference Works] List specific films with style characteristics
```

### 3. Workflow

1. Read Art Direction Card + Character Asset Card
2. Find and reference existing successful prompts as templates
3. Generate new prompt using template structure, replace only character-specific info

## Quality Checklist

- [ ] Art direction card read
- [ ] Existing successful template referenced
- [ ] Complete 4-area layout described
- [ ] Expressions "arranged in 2 rows of 3 columns"
- [ ] Complete technical requirements (4K, orthographic, etc.)
- [ ] [Reference Work Style] section present
- [ ] Art direction parameters cited (palette, lighting values)
- [ ] Visual style explicitly named

## Common Errors

| Error | Fix |
|-------|-----|
| Vague style ("professional character design") | Explicit style name + reference works + film references |
| Missing tech specs | Always include: 16:9, #FFFFFF bg, orthographic, 4K, no logos |
| Imprecise layout | Specify row/column counts and percentages |
| No art direction params | Cite specific color hex values, lighting color temp, contrast ratios |
