# Scene Asset Purity Principle

Scene assets must be **clean scenes without main characters** — clean space + set dressing props + lighting atmosphere only. Characters are added through post-production compositing.

## Allowed (✅) / Prohibited (❌)

**Allowed**: Architecture, furniture, placed props (not held), environmental effects, natural elements, extremely blurred background crowds as scale reference.

**Prohibited**: Main characters, character-specific actions/poses/expressions, props being actively used/held/worn, any identifiable facial features.

## Prop Boundaries

- **Scene Props**: Placed/resting state, not in use (e.g., beer bottles on table, tablet on desk)
- **Character Props**: Being used, worn, or held (e.g., beer held by character, watch worn)

## Description Conventions

❌ "Lin Yuan reclining on sofa, holding a beer"
✅ "Large L-shaped leather sofa, empty state. Black marble coffee table with beer bottles placed on top."

❌ "Workers in uniforms standing beside production line"
✅ "Empty work stations beside production line, no operators"

## GPT-Image-2 Negative Prompt (Required)

```
people, person, characters, human, man, woman, figure, face, body, hand, arm, leg
```

## Quality Checklist

- [ ] No main characters or identifiable persons in frame
- [ ] Space presented as complete independent environment
- [ ] Props in placed/resting state, not in use
- [ ] Negative prompt includes character exclusion terms
- [ ] Card notes state: "Clean scene; characters added through compositing"

## Why Maintain Purity

- **Asset reuse**: Same scene for multiple characters/shots
- **Post flexibility**: Adjust character position/action/expression independently
- **Parallel production**: Scene and character teams work independently
- **Version support**: Same scene supports different character combinations
