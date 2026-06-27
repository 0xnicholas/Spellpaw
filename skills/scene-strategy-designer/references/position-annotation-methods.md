# Position Annotation Methods

For Stage 6 of scene-strategy-designer. Read when annotating character positions on scene effect images.

## Method A: Generate Transparent Annotation Layer (Recommended)

Generate a transparent PNG overlay with numbered markers, then composite locally.

### Overlay Prompt Template

```
Generate a transparent overlay layer (PNG with alpha channel) for character position annotations.

Format: 16:9 horizontal, 3840x2160 pixels, transparent background

Annotation markers:
- Style: Numbered circular markers with white background, black numbers
- Size: 80px diameter circles
- Text: Bold sans-serif font, size 48px
- Contrast: White circle with 3px black outline

Position coordinates (from top-left corner):
1. Position 1 - [Character Name]: X=[x]px, Y=[y]px
...

Additional: dotted lines connecting related characters, small text name labels below numbers (20px)
Background: Completely transparent (alpha = 0)
Output: PNG with alpha channel
```

### Local Compositing

```bash
# ImageMagick
convert scene_effect.png annotation_layer.png -composite final_with_annotations.png

# Python PIL
from PIL import Image
base = Image.open('scene_effect.png')
overlay = Image.open('annotation_layer.png')
base.paste(overlay, (0, 0), overlay)
base.save('final_with_annotations.png')
```

## Method B: Text Description Document

Fallback when no image tools available. Structure:

```markdown
# Character Position Annotations
## Annotation 1: [Character Name]
- Position: [foreground/midground/background], [specific location]
- Posture: [posture description]
- Frame proportion: [percentage]
```

## Method C: Manual Drawing

Use Photoshop, GIMP, Figma for full custom annotation control.
