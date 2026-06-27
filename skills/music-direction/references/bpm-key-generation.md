# BPM and Key Generation

Helper functions for generating specific BPM values and musical keys for Suno/Udio prompt parameters. Do not inline in SKILL.md.

## defaultBPM Generation

Extract or infer default BPM from tempoRange:

```typescript
function generateDefaultBPM(tempoRange: string, emotionalMapping: EmotionalMapping[]): number {
  // Method 1: extract mid-value from tempoRange
  const rangeMatch = tempoRange.match(/(\d+)-(\d+)\s*BPM/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);
    return Math.round((min + max) / 2);
  }
  // Method 2: average from emotionalMapping
  const bpms = emotionalMapping
    .map(m => extractBPMFromTempo(m.tempo))
    .filter(bpm => bpm !== undefined);
  if (bpms.length > 0) {
    return Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
  }
  return 90; // fallback
}

function extractBPMFromTempo(tempo: string): number | undefined {
  const rangeMatch = tempo.match(/(\d+)-(\d+)\s*BPM/);
  if (rangeMatch) return Math.round((parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2);
  const singleMatch = tempo.match(/(\d+)\s*BPM/);
  if (singleMatch) return parseInt(singleMatch[1]);
  return undefined;
}
```

## defaultKey Generation

```typescript
function generateDefaultKey(keyTendency: string, musicalTradition: string): string {
  if (musicalTradition.includes('Chinese traditional') || musicalTradition.includes('古风')) {
    if (keyTendency.includes('pentatonic')) return 'pentatonic';
  }
  if (keyTendency.includes('minor')) return 'C minor';
  if (keyTendency.includes('major')) return 'C major';
  if (keyTendency.includes('atonal')) return 'atonal';
  if (musicalTradition.includes('Western classical')) return 'C major';
  if (musicalTradition.includes('electronic') || musicalTradition.includes('industrial')) return 'C minor';
  return 'C major';
}
```

## Emotion → Key

```typescript
function inferKeyFromEmotion(emotion: string, defaultKey: string): string {
  if (emotion.includes('sad') || emotion.includes('parting')) return 'C minor';
  if (emotion.includes('tense') || emotion.includes('crisis') || emotion.includes('horror')) return 'atonal';
  if (emotion.includes('joy') || emotion.includes('victory')) return 'C major';
  if (emotion.includes('heroic') || emotion.includes('epic')) return defaultKey;
  return defaultKey;
}
```

## BPM Generation Example Output

```typescript
{
  tonalCharacteristics: {
    keyTendency: "pentatonic primary",
    defaultKey: "pentatonic",
    tempoRange: "40-160 BPM",
    defaultBPM: 100,
    dynamicRange: "ppp to fff"
  },
  emotionalMapping: [
    { emotion: "heroic/epic", bpm: 130, key: "pentatonic", instruments: ["war drums", "strings", "horns", "guzheng"] },
    { emotion: "sad/parting", bpm: 50, key: "C minor", instruments: ["erhu", "guzheng"] },
    { emotion: "tense/crisis", bpm: 160, key: "atonal", instruments: ["pipa", "bass strings", "timpani"] }
  ]
}
```
