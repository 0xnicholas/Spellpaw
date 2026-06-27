# Prop Setting Card Schema & Inference Rules

For Step 7 of script-deconstruct. Read when extracting prop cards from the episode-scene table.

## Field Definitions

```typescript
interface PropSettingCard extends BaseCard {
  type: 'prop_design';
  content: {
    name: string;
    category: string;             // Weapon / Tool / Accessory / Document / Vessel / Special prop
    importance: 'core' | 'supporting' | 'background';
    roleInStory: string;
    basicAppearance: {
      size: string;
      shape: string;
      material: string;
      color: string;
      distinctiveFeatures: string[];  // 2-5 distinctive features
    };
    functionality: {
      primaryFunction: string;
      secondaryFunctions?: string[];
      usage: string;
    };
    symbolism?: {
      meaning: string;
      emotionalConnection?: string;
    };
    propStates: Array<{
      stateName: string;
      episodeRange?: { start: number; end: number };
      visualCharacteristics: { condition: string; appearance: string };
      keyDifferences?: string;
      triggerEvent?: string;
    }>;
    keyAppearances: Array<{
      episode: number;
      scene?: string;
      context: string;
      significance: string;
    }>;
    linkedCards: {
      sourceScriptCardId: string;
      relatedCharacterCardIds?: string[];
      relatedSceneCardIds?: string[];
    };
  };
}
```

## Extraction Rules

1. Count prop appearance frequency → determine importance (30+ = core, 10-29 = supporting, 1-9 = background)
2. Extract basicAppearance from first appearance scene
3. Extract functionality from usage scenes
4. Infer symbolism from prop origin and key scenes
5. Group by state to identify propStates (each state = one asset card)
6. Select key appearance scenes for keyAppearances

## Inference Rule Library

### Size Inference

| Script Description | Category | Reference | Inferred |
|---------|----------|-----------|----------|
| Small (handheld) | Small | Handheld | Crystal 5-10cm, weapon 30-50cm, tool 20-40cm |
| Medium | Medium | Single-person carry | 30-100cm |
| Large | Large | Multi-person carry | 1-3m |
| Industrial equipment | Extra Large | Fixed installation | 3m+ |

### Material Inference

| Category | Default type | Default surface | Basis |
|---------|---------|----------------|---------|
| Weapon | Metal/Composite | Brushed/Worn | Art direction: metal |
| Tool/Equipment | Metal/Plastic | Industrial texture | Art direction: synthetic |
| Special prop | Energy crystal | Smooth transparent | Art direction: crystal spec |
| Building component | Metal/Concrete | Rough/Brushed | Art direction: concrete |
| Daily prop | Wood/Fabric | Natural texture | Art direction: fabric |

Special properties: "glowing" → self-illuminating; "energy flow" → internal energy visible; "smoke" → smoke effect; "waterproof" → waterproof sealed.

### Color Scheme Inference

- Underwater base scene → secondaryPalette (deep blue #4A90D9 etc.)
- Land ruins scene → primaryPalette (gray-blue #7A8B8B etc.)
- Special prop (crystal) → script description ("dark purple/gold")
- Weapon/danger → cool tones (metallic gray/black/red)
- Daily/warm → warm tones (wood/cream/warm white)
- Glow props → accent color = glow color
- Core + positive emotion → noble/rare feel; core + negative → cold/dangerous

### Visual Effects Inference

- "glowing" → glowType: "constant"; "flashing" → "flashing"; "pulsing" → "pulsing"
- "high-purity/enhanced" → glowIntensity: "strong"; "normal/basic" → "weak"
- Glow color: default = primary color; script explicit → use script
- "energy flow/particles" OR strong glow → particles: true
- Strong glow + particles → ambientEffect: "air distortion"

### Inference Priority

1. Script explicit → use directly, no `_inferred` mark
2. Script partial → supplement with inference, mark `_inferred: true`
3. Script none → fully infer, mark `_inferred: true`
