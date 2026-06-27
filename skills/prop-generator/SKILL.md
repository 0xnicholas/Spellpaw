---
name: prop-generator
description: Use when a PropAssetCard has been generated and needs standardized prop multi-view images (including main view area, detail close-up area, and state comparison area)
---

# Prop Generator Skill

Generate standardized prop multi-view images from prop asset cards, default output includes a full display image with main view area + detail close-up area + state comparison area, referencing the character makeup/costume turnaround sheet standard.

## Overall Workflow

```
Input: PropAssetCard (prop asset card, from asset zone)
Optional Input: ArtDirectionCard (art direction card)

Stage 1: Dependency Check
Stage 2: Build Multi-View Display Plan
Stage 3: Generate Multi-View Image Prompt (default)
Stage 4: Call Image Generation Model
Stage 5: Quality Check
Stage 6: Create Prop Concept Card

Output: PropConceptCard (prop concept card, defaulting to multi-view image)
```

---

## Stage 1: Dependency Check

**Check Items**:
1. Prop asset card (required)
2. Art direction card (optional)

**Error Handling**: If the prop asset card does not exist, prompt the user to first run `/prop-asset-extraction`

---

## Stage 2: Build Multi-View Display Plan

**Default Output**: Multi-view image (`multi_view`), a single image containing three areas, 16:9 landscape.

### 2.1 Multi-View Image Layout

```
┌─────────────────────────────────────────────────────────────┐
│                  Prop Multi-View (16:9)                     │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │                      │  │  Detail Close-up Area     │    │
│  │   Main View Area     │  │  (4-6 panels)            │    │
│  │   (60%)              │  │  ┌────┬────┬────┐        │    │
│  │   3-4 views          │  │  │ D1 │ D2 │ D3 │        │    │
│  │                      │  │  ├────┼────┼────┤        │    │
│  │   ┌────┬────┬────┐  │  │  │ D4 │ D5 │Mat │        │    │
│  │   │ V1 │ V2 │ V3 │  │  │  └────┴────┴────┘        │    │
│  │   └────┴────┴────┘  │  │                          │    │
│  │                      │  ├──────────────────────────┤    │
│  │                      │  │  State Comparison Area   │    │
│  └──────────────────────┘  │  ┌──────────┬──────────┐ │    │
│                            │  │ State A  │ State B  │ │    │
│                            │  └──────────┴──────────┘ │    │
│                            └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Zone Content Rules

**Main View Area (Left 60%)**:

| Prop Category | View 1 | View 2 | View 3 | View 4 (optional) |
|---------|------|------|------|------------|
| Weapons | Front | 45° oblique | Side | Grip view |
| Tools/Equipment | Front full | Side full | Top-down | 45° oblique |
| Special props | Front floating | 45° oblique | Side | Top-down |
| Architectural elements | Front full | Side full | Top-down | Cross-section |

**Detail Close-up Area (Top-right 40%)**:

| Prop Category | Detail 1 | Detail 2 | Detail 3 | Detail 4 |
|---------|------|------|------|------|
| Weapons | Grip area | Mechanical structure | Ammo/energy loading | Effect glow |
| Tools/Equipment | Control panel | Moving parts | Material texture | Indicator lights/strips |
| Special props | Glow effect | Energy flow | Material detail | Particle effects |
| Architectural elements | Connection joints | Material texture | Structural detail | Functional parts |

**State Comparison Area (Bottom-right 40%)**:
- Multiple states: display visual differences side by side
- Single state: replace with additional detail close-ups or usage illustration

### 2.3 Background and Lighting Rules

**Background**:
- core → Pure black / dark gradient background
- supporting → Scene-bokeh background
- background → Simple scene background

**Lighting**:
- Self-illuminating props → Self-illumination primary, soft ambient fill
- Metal props → Directional light to highlight metal reflections and edge highlights
- Transparent props → Backlight to emphasize transparency
- Composite materials → Multi-light combination (key + fill + rim)

---

## Stage 3: Generate Multi-View Image Prompt

**Default model**: GPT-Image-2 (Chinese natural language)
**Alternative models**: Gemini (Imagen 3), Seedance5.0 (English labels)
**Default aspect ratio**: 16:9 landscape

### GPT-Image-2 Multi-View Template (primary model)

```
【道具多视角图 - {道具名称} - {状态名称}】

画面布局：横版16:9，纯白/纯黑背景，分为三个区域，所有视角中的道具完全一致

区域1：主视角区（左侧60%）
{视角1名称}（左上）、{视角2名称}（右上）、{视角3名称}（左下）、{视角4名称}（右下，可选）
每个视角展示完整道具，{展示角度描述}，{背景方案}，{光照描述}

区域2：细节特写区（右上）
{细节数量}个细节特写网格排列：
• {细节1名称}：{细节1描述}
• {细节2名称}：{细节2描述}
• {细节3名称}：{细节3描述}
• {细节4名称}：{细节4描述}

区域3：状态对比区（右下）
{状态A名称}（左）vs {状态B名称}（右）：
• {状态A}：{状态A视觉特征}
• {状态B}：{状态B视觉特征}

道具外观：
{形状描述}，{尺寸参考}，{材质质感}，{表面处理}

颜色方案：
主色调{主色调}，辅助色{辅助色}，点缀色{点缀色}，{色调倾向}

特效细节：
{发光效果}，{发光颜色}，{粒子效果}，{使用时特效}

标志性特征：
{distinctiveFeatures逐条描述}

设计风格：
{视觉符号设计方向}，{象征意义体现}

整体要求：
超高清，产品概念图风格，{美术风格关键词}，无人物，道具展示图，16:9横版，精细材质渲染，所有视角道具完全一致
```

**Example (Purification Machine - Normal Operation)**:

```
【道具多视角图 - 净化机 - 正常运营状态】

画面布局：横版16:9，纯黑背景，分为三个区域，所有视角中的道具完全一致

区域1：主视角区（左侧60%）
正面全景（左上）、侧面全景（右上）、顶视俯瞰（左下）、45度斜视（右下）
每个视角展示完整的成排净化机设备（3-5台），正面全景微仰视角强调规模，侧面全景展示纵深感，顶视俯瞰展示排列布局，45度斜视展示立体结构，纯黑背景，定向光从左前方45度照射突出金属质感和边缘高光，指示灯自发光作为点缀光源

区域2：细节特写区（右上）
6个细节特写网格排列：
• 控制面板：成排指示灯逐个亮起，荧光蓝绿色光芒，中等发光强度
• 传送带运转：金属滚轮、传动链条、防滑纹理，运转状态
• 金属拉丝纹理：机械加工纹理、焊接痕迹可见，工业质感
• 管道连接：金属管道和电缆连接，暖灰色框架，工业细节
• 侧面灯带：垂直灯带常亮，荧光蓝绿色，照亮地面形成光晕
• 净化舱透明窗：中部净化处理舱，可见内部结构

区域3：状态对比区（右下）
初始安装（左）vs 正常运营（右）：
• 初始安装：所有指示灯熄灭，无发光效果，冷色调工作灯照明，设备静止
• 正常运营：指示灯成排亮起，荧光蓝绿色光芒，传送带运转，地面光晕

道具外观：
大型工业净化水设备，成排排列，单台高约3-4米、宽约2米。矩形主体机身，顶部控制面板，中部净化舱，底部传送带，设备间管道电缆连接，工业金属材质，表面拉丝/磨砂处理，机械加工纹理清晰，焊接痕迹可见

颜色方案：
主色调金属灰/银白色（主体机身），辅助色暖灰色#8C8C8C（支架、传送带框架），点缀色荧光蓝绿色（指示灯、灯带），工业冷峻感与科技感结合

特效细节：
控制面板指示灯成排逐个亮起（荧光蓝绿色），形成从左到右的视觉节奏感。侧面灯带常亮发光，照亮周围地面形成微弱光晕。传送带状态灯闪烁，显示系统运行

标志性特征：
成排排列的工业设备形成强大视觉冲击力，逐个亮起的指示灯如同生命线，传送带飞转，象征林渊末世经济垄断能力

设计风格：
现代工业设备美学，写实末世科幻风，功能性与可信度，金属拉丝纹理、焊接痕迹、管道连接等细节强化工业质感

整体要求：
超高清，产品概念图风格，写实末世科幻风，无人物，道具展示图，16:9横版，精细材质渲染，所有视角道具完全一致
```

---

### Gemini (Imagen 3) Multi-View Template (alternative, concise Chinese)

```
【道具多视角图 - {道具名称} - {状态名称}】

布局：16:9横版，{背景方案}，三区域

主视角区（左60%）：{视角1}、{视角2}、{视角3}、{视角4}，{光照描述}

细节特写区（右上）：
• {细节1}：{描述}
• {细节2}：{描述}
• {细节3}：{描述}
• {细节4}：{描述}

状态对比区（右下）：{状态A}（{特征}）vs {状态B}（{特征}）

外观：{形状}，{尺寸}，{材质}，{颜色}
特效：{发光/粒子效果}
特征：{distinctiveFeatures}
风格：{设计方向}，超高清，产品概念图，无人物，16:9，所有视角道具完全一致
```

---

### Seedance5.0 Multi-View Template (alternative, English labels)

```
prop multi-view sheet, {prop_name}, {state_name},
16:9 landscape, {background_type}, {lighting_setup},
three zones layout,
zone1 main views (left 60%): {view1}, {view2}, {view3}, {view4},
zone2 detail close-ups (right top): {detail1}, {detail2}, {detail3}, {detail4},
zone3 state comparison (right bottom): {state_a} vs {state_b},
{shape_description}, {size_reference},
{material_texture}, {surface_treatment},
{primary_color}, {secondary_color}, {accent_color}, {color_grading},
{glow_effect}, {glow_color}, {particle_effects},
{distinctive_features},
{design_direction}, {symbolic_elements},
product concept art, ultra detailed, no characters,
{art_style_keywords}, prop showcase,
all views perfectly consistent, 8k resolution, material rendering
```

---

## Stage 4: Call Image Generation Model

### Model Selection Recommendations

| Prop Characteristics | Recommended Model | Reason |
|---------|---------|------|
| Default / most props | GPT-Image-2 | Precise Chinese description, good layout control, fine effects/glow |
| GPT-Image-2 fails or unsatisfactory | Gemini (Imagen 3) | Alternative, concise prompts |
| Batch generation of multiple props | Seedance5.0 | Label-based, easy batch adjustments |

### Generation Order

1. **core props**: Generate main state multi-view image first, then other states (if any)
2. **supporting props**: Generate multi-view image directly
3. **background props**: Generate multi-view image directly

---

## Stage 5: Quality Check

**Multi-View Consistency**:
- [ ] Prop shape, material, and color are fully consistent across all views
- [ ] Distinctive features (distinctiveFeatures) are clearly visible in main views
- [ ] Detail close-ups match corresponding areas in main views
- [ ] State comparison differences are clearly distinguishable

**Visual Quality**:
- [ ] Material textures are clear, metal/transparent/glow effects look natural
- [ ] Background does not distract from the subject
- [ ] Three-zone layout is clear with no overlap

**Symbolic Expression**:
- [ ] Visual symbol design direction is reflected
- [ ] Detail fidelity matches importance level requirements

### Quality Scoring

| Dimension | Weight |
|------|------|
| Multi-view consistency | 40% |
| Visual quality | 35% |
| Symbolic expression | 25% |

**Pass criteria**: Total score ≥ 70

---

## Stage 6: Create Prop Concept Card

```typescript
interface PropConceptCard {
  id: string;
  type: 'prop_concept';
  title: string;  // e.g. "净化机 - 正常运营状态 - 道具多视角图"

  content: {
    upstreamCards: {
      propAssetCard: string;
      artDirectionCard?: string;
    };
    stateName: string;
    viewType: 'multi_view' | 'main' | 'detail' | 'effect' | 'state_comparison';  // default multi_view
    generationConfig: {
      model: 'gpt-image-2' | 'gemini' | 'seedance5';
      aspectRatio: '16:9' | '1:1';  // default 16:9
      backgroundType: string;
      lightingSetup: string;
      layout: {
        mainViewsCount: number;  // number of main views (3-4)
        detailsCount: number;    // number of detail close-ups (4-6)
        hasStateComparison: boolean;  // whether state comparison exists
      };
    };
    prompts: {
      cn?: string;   // GPT-Image-2 / Gemini Chinese prompt
      en?: string;   // Seedance5.0 English prompt
    };
    generatedImages: Array<{
      imageUrl: string;
      generatedAt: string;
      qualityScore: number;
      isApproved: boolean;
    }>;
    approvedImage?: string;
  };
}
```

---

## Collaboration with Other Skills

### Upstream Dependencies
- **script-deconstruct**: Provides prop design cards
- **prop-asset-extraction**: Provides prop asset cards (required)
- **art-direction**: Provides art direction cards (optional)

### Downstream Output
- Provides prop reference images for storyboard design
- Provides prop base images for AI video generation
- Provides prop effects reference for VFX teams

---

## Test Cases

### Test Case 1: Purification Machine (dual-state, core, equipment type)

**Input**: Purification Machine prop asset card (initial installation + normal operation)

**Expected Output**:
- Main view area: front full, side full, top-down, 45° oblique
- Detail close-up area: control panel, conveyor belt, metal texture, pipe connections, light strips, purification chamber
- State comparison area: initial installation (no glow) vs normal operation (indicators lit up)

### Test Case 2: Crystal Core (dual-state, core, special prop type)

**Input**: Crystal Core prop asset card (normal + high purity)

**Expected Output**:
- Main view area: front floating, 45° oblique, side, top-down
- Detail close-up area: glow effect, energy flow, crystal facets, particle effects
- State comparison area: normal crystal core (dim purple glow) vs high purity crystal core (golden bright glow)

### Test Case 3: Crystal Core Gun (single-state, supporting, weapon type)

**Input**: Crystal Core Gun prop asset card

**Expected Output**:
- Main view area: front, 45° oblique, side, grip view
- Detail close-up area: magazine crystal core spinning, barrel energy beam, grip area, mechanical structure
- State comparison area: replaced with additional details (standby vs firing state)

---

## Implementation Checklist

- [ ] Stage 1: Dependency check complete
- [ ] Stage 2: Multi-view display plan confirmed (view config, detail selection, state comparison)
- [ ] Stage 3: Multi-view image prompt generated
- [ ] Stage 4: Image generation model call successful
- [ ] Stage 5: Quality check passed (total score ≥ 70, multi-view consistency met)
- [ ] Stage 6: Prop concept card created successfully

---

**Skill Version**: v2.0  
**Created**: 2026-05-29  
**Updated**: 2026-05-30  
**Update Notes**: Default output changed to multi-view image (16:9), referencing character makeup/costume turnaround sheet standard  
**Test Status**: Tested (Purification Machine)

## Generated File Naming Convention

Prop asset images must save `filename` in the following format:

```text
道具资产-{道具名字}-{状态}-v{版本号}
```

Omit the state segment when there is no state. Example: `道具资产-净化机-启动状态-v001.png`.

## Next Step After Completion

Completion criteria: `PropConceptCard` created, image version confirmed and available for the production zone to reference.

After completing current prop generation, check whether the current episode/scene has other prop assets that need production.

- If there are unfinished props in the same scene: suggest continuing with `prop-asset-extraction` or `prop-generator`.
- If the current episode/scene prop assets are sufficient: notify the user they can continue with other assets, or call `production-coordinator` to begin production for this specific episode and scene.

Recommended phrasing: `Current prop asset image is confirmed. I will now check if the current episode/scene has other prop assets needing production; if not, we can enter production-coordinator to begin scene production.`
