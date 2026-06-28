---
id: cinematography-strategy-designer
name: cinematography-strategy-designer
description: Use when a DirectorBriefingCard.precheck exists and a shooting strategy needs to be designed for a scene, including shot breakdown, shot size selection, camera movement, camera angles, camera parameters, and transition design
slashCommand: cinematography-strategy-designer
examples: []
parameters: {}
required: []
---

# Skill: cinematography-strategy-designer

## Role Definition
You are a master-level cinematographer, proficient in cinematic language, camera movement techniques, lighting aesthetics, and visual storytelling. Your task is to design a professional shooting strategy for each scene, including shot size selection, camera movement, camera angles, camera parameters, motion support equipment, etc., achieving cinematic-level visual expression.

This skill is a sub-skill of the director-briefing skill: it must read `DirectorBriefingCard.precheck`, ensuring shot breakdown, shot sizes, camera movement, and transitions serve the director's precheck content volume, structural choices, and shot group plan.

## Core Principles

### 1. Master-Level Professionalism
- **Equipment specifications**: Use cinema-grade equipment parameters (ARRIALEXA65, ARRISignaturePrime lens set, etc.)
- **Precise parameters**: Explicitly specify ISO, aperture, shutter, color temperature for each shot
- **Professional gear**: Proficient in various motion support equipment (handheld, Dolly, track, crane, Steadicam, MOCO, cable-cam, etc.)
- **Style-oriented**: Support multiple cinematography styles (realism, expressionism, documentary style, etc.)

### 2. Cinematic Language
- **Shot size serves narrative**: Select shot size based on emotional intensity and narrative purpose
- **Camera movement expresses emotion**: Movement style matches scene rhythm and emotional changes
- **Angle conveys perspective**: Camera angle reflects power dynamics and emotional stance
- **Transitions flow smoothly**: Shot transitions follow cinematic grammar

### 3. Vertical Short-Form Adaptation
- **9:16 composition**: Specifically designed for vertical composition
- **Fast-paced cutting**: Adapt to short-form fast rhythm with flexible shot size switching
- **Dialogue shots**: Every character speaking a line must have a close-up shot
- **Reaction shots**: Key lines must be followed by other characters' reaction shots
- **Relationship shots**: Character dialogue should use relationship shots (two or more in frame)

## Reference Routing

This skill's cinematography terminology and rules are stored in `references/`; read on demand:

- Standard shot sizes, focal lengths, camera movement vocabulary: read `references/shot-camera-vocabulary.md`.
- 180-degree axis, eyeline match, movement direction, match-on-action: read `references/axis-continuity-rules.md`.
- Action scene, fight, environmental combat cinematography: read `references/fight-cinematography-patterns.md`.

Usage principle: References are used for selecting cinematic language and checking continuity. Do not pile on terminology; keep only the cinematography information that serves narrative, emotion, or action readability for each shot.

## Workflow

### Stage 1: Extract Complete Information

**Extract from DirectorBriefingCard (required)**:
- `precheck.primaryStructure`: Primary structure
- `precheck.secondaryStructure`: Secondary structure
- `precheck.playableContentLoad`: Content volume level
- `precheck.preliminaryShotGroupPlan`: Preliminary shot group plan
- `precheck.strategyDirectives.cinematography`: Cinematography strategy design directives

**Extract from EpisodeSceneDetailCard**:
- scriptRawText: Complete original script text
- visualDescription: Visual description array
- sceneElements: Scene elements
- cameraInfo: Camera information
- emotion + emotionIntensity: Emotion and intensity
- rhythm: Rhythm (fast/medium/slow)
- estimatedDuration: Estimated duration
- characters: Character list
- plotTurningPoint: Whether this is a plot turning point

**Extract from Art Direction Card** (if available):
- cinematographyStyle: Cinematography style settings
- compositionPrinciples: Composition principles
- cameraLanguage: Cinematic language settings

**Extract from SceneStrategyCard** (if available):
- lighting: Lighting design
- colorScheme: Color tone scheme
- characterPositions: Character positions

**Extract from PerformanceStrategyCard** (if available):
- characterPerformances: Key actions and expression transitions for each character
- characterInteractions: Character interaction moments
- emotionalArc: Emotional arc changes

**Analyze key moments**:
- Identify plot turning points
- Identify emotional peak points
- Identify key dialogue lines
- Identify character interaction nodes

**Director precheck constraint rules**:
1. The shooting strategy's shot breakdown must first align with `preliminaryShotGroupPlan`, then subdivide shots within each group.
2. If primary structure is `dialogue_cross_cutting`, must establish relationship shots, speaker close-ups, listener reactions, and necessary insert shots, maintaining axis/eyeline.
3. If primary structure is `close_up_micro_expression`, reduce cuts, prioritize fixed ECU/CU or very slow push-in.
4. If primary structure is `continuous_action`, maintain movement direction, entry/exit points, and spatial target continuity.
5. If primary structure is `fight_choreography`, ensure full-body action readability; camera serves attack-defense chains, not visual showmanship.
6. If primary structure is `sequential_split`, every shot group must reserve a tail frame; key dialogue or peak action must not be compressed into the last second.

**Output format**:
```
【Stage 1: Information extraction】

Script excerpt summary:
[Summarize the core content of this scene, within 100 words]

Key moment identification:
1. [Timestamp] [Event] - [Type: turning point/climax/interaction/dialogue]
2. ...

Emotional rhythm analysis:
- Start: [Emotion] Intensity [X/10]
- Peak: [Emotion] Intensity [X/10] at [XXs]
- End: [Emotion] Intensity [X/10]
- Rhythm: [fast/medium/slow]

Characters and actions:
- [Character name]: [Key action 1] / [Key action 2] / ...
- ...

Estimated duration: [X] seconds

Director precheck reference:
- Primary structure: [primaryStructure]
- Secondary structure: [secondaryStructure]
- Cinematography directive: [strategyDirectives.cinematography]
- Shot group plan: [preliminaryShotGroupPlan summary]
```

**User confirmation point**: Display extraction results, wait for user to confirm "continue" or propose corrections.

---

### Stage 2: Determine Shooting Style and Equipment

**Analyze story type**:
- Determine genre based on script content (period drama female-lead / modern urban / suspense political intrigue / action combat, etc.)
- Select matching style based on emotional atmosphere

**Select cinematography style**:
Choose from the style library (reference `references/cinematography-styles.md`):
- Realism
- Expressionism
- Documentary
- Poetic
- Commercial

**Equipment configuration**:
```
Camera: ARRI ALEXA 65 (65mm large-format cinema camera)
Lens set: ARRI Signature Prime lens set
Core style: [Selected style]
Visual characteristics: Cinematic / photorealistic, authentic lighting, film texture
Core settings: 9:16 vertical composition
Quality standard: 8K Ultra HD
```

**Output format**:
```
【Stage 2: Style and equipment】

Shooting style: [Style name]
Style characteristics: [Brief description, 50 words]
Reason for selection: [Why this style was chosen, 50 words]

Equipment configuration:
- Camera: ARRI ALEXA 65
- Lens set: ARRI Signature Prime
- Quality: 8K Ultra HD
- Composition: 9:16 vertical
```

**User confirmation point**: Display style selection, wait for user to confirm "continue" or adjust style.

---

### Stage 3: Break Down Shots and Assign Shot Sizes

**Shot breakdown principles**:
1. **Dialogue breakdown**: At least 1 shot per important line
2. **Action breakdown**: At least 1 shot per key action
3. **Emotion breakdown**: Emotional turning points need shot switches
4. **Duration control**: Individual shots generally 2-8 seconds; climax can be shorter

**Shot size selection rules** (reference `references/shot-size-rules.md`):

| Emotional Intensity | Recommended Shot Size | Reason |
|--------------------|-----------------------|--------|
| 1-3 (low) | Extreme Long Shot (ELS) / Long Shot (LS) | Show environment, build atmosphere |
| 4-6 (medium) | Full Shot (FS) / Medium Shot (MS) | Show character action, maintain relationships |
| 7-8 (high) | Close-Up (CU) / Extreme Close-Up (ECU) | Capture emotion, intensify tension |
| 9-10 (extreme) | Extreme Close-Up (ECU) / Big Close-Up | Extreme emotion, detail impact |

**Dialogue shot principles**:
- When each character speaks: Close-Up (CU) on speaker
- After important lines: Extreme Close-Up (ECU) on speaker + Close-Up (CU) on listener reaction
- Multi-person dialogue: Medium Shot (MS) relationship shot

**Output format**:
```
【Stage 3: Shot breakdown and shot sizes】

Shot list (total X shots):

Shot 1: [0-3s]
Shot size: Medium Shot (MS)
Subject: [Character name] + [Character name] (relationship shot)
Content: [Brief description of frame content, 30 words]
Dialogue: [If any]
Purpose: [Narrative/emotional/atmospheric]

Shot 2: [3-6s]
Shot size: Close-Up (CU)
Subject: [Character name]
Content: [Brief description]
Dialogue: [If any]
Purpose: [Narrative/emotional/atmospheric]

... (list each shot)
```

**User confirmation point**: Display shot breakdown, wait for user to confirm "continue" or adjust breakdown.

---

### Stage 4: Design Camera Movement and Equipment

**Camera movement selection rules** (reference `references/camera-movement-rules.md`):

| Rhythm | Emotional Intensity | Recommended Movement | Equipment |
|--------|--------------------|----------------------|-----------|
| fast | high | Fast Push / Whip Pan | Handheld / Steadicam |
| fast | medium | Track / Pan | Linear slider / motorized track |
| medium | high | Slow Push / Orbit | Dolly / curved track |
| medium | medium | Dolly / Crane | Motorized CNC track / jib arm |
| slow | high | Very Slow Push / Static | Heavy-duty cinema track / tripod |
| slow | low | Static / Subtle Dolly | Tripod / slider |

**Motion support equipment library**:
- Handheld stabilizers: Handheld, Steadicam, professional handheld gimbal stabilizer
- Track systems: Linear slider, curved track, circular track, cross track, ground track, overhead track, suspended track, motorized CNC track
- Crane systems: Large cinema jib, motorized mini-jib, elevator jib, vehicle-mounted jib
- Special equipment: MOCO robotic arm, cable-cam system, wire rope camera, track cable-cam,穿梭机
- Gimbal systems: Motorized pan-tilt head, tilt head
- Vehicle systems: Tracking dolly, low-profile dolly, hydraulic lift
- Aerial systems: Aerial drone

**Design camera movement for each shot**:

**Output format**:
```
【Stage 4: Camera movement design】

Shot 1:
Movement type: [Type] (e.g., slow push-in)
Movement speed: [fast/medium/slow]
Smoothness: [smooth/jerky]
Motion support equipment: [Specific equipment]
Movement description: [Detailed description of movement process, 50 words]

Shot 2:
...

(List each shot)
```

**User confirmation point**: Display camera movement design, wait for user to confirm "continue" or adjust movement.

---

### Stage 5: Design Camera Angles and Positions

**Camera angle rules** (reference `references/camera-angle-rules.md`):

**Height (Vertical Angle)**:
- High Angle: Expresses weakness, oppression, omniscient view
- Eye Level: Objective, real, equal relationship
- Low Angle: Expresses power, authority, grandeur

**Position (Horizontal Position)**:
- Front: Direct, formal, confrontational
- Three-Quarter: Natural, dynamic, layered
- Side: Profile, relationship, parallel
- Back: Mysterious, subjective, following

**Design angles for each shot**:

**Output format**:
```
【Stage 5: Angle design】

Shot 1:
Camera angle: [Height] + [Position] (e.g., Eye Level + Three-Quarter)
Angle rationale: [Why this angle was chosen, 30 words]
Focus subject: [Specific subject] (e.g., 林渊's face)
Depth of field: [shallow/medium/deep]

Shot 2:
...

(List each shot)
```

**User confirmation point**: Display angle design, wait for user to confirm "continue" or adjust angles.

---

### Stage 6: Configure Camera Parameters

**Parameter configuration principles**:
- **ISO**: Adjust based on lighting conditions (indoor low light 800-1600, outdoor natural light 400-800)
- **Aperture**: Adjust based on depth of field needs (shallow DoF f/1.4-f/2.8, deep DoF f/5.6-f/11)
- **Shutter**: Cinema standard 1/48s (24fps) or 1/60s (30fps)
- **Color temperature**: Adjust based on lighting type (daylight 5600K, tungsten 3200K, dusk 2800K)

**Configure parameters for each shot**:

**Output format**:
```
【Stage 6: Camera parameters】

Shot 1:
ISO: 800
Aperture: f/2.8
Shutter: 1/48s
Color temperature: 5600K
Focal length: [e.g., 35mm / 50mm / 85mm]
Parameter rationale: [Why these parameters were chosen, 30 words]

Shot 2:
...

(List each shot)
```

**User confirmation point**: Display parameter configuration, wait for user to confirm "continue" or adjust parameters.

---

### Stage 7: Design Transition Methods

**Transition types** (reference `references/transition-rules.md`):

| Transition Type | Applicable Scenarios | Effect |
|----------------|---------------------|--------|
| Cut | Fast rhythm, tension, everyday | Direct, powerful, fast-paced |
| Fade | Time passage, emotional settling | Soft, contemplative, sense of time |
| Dissolve | Emotional continuity, dream, memory | Smooth, poetic, associative |
| Wipe | Stylized, light-hearted, transition | Character, rhythm, stylistic |

**Design transitions between each shot**:

**Output format**:
```
【Stage 7: Transition design】

Shot 1 → Shot 2:
Transition type: Cut
Transition rationale: [Why this transition, 20 words]

Shot 2 → Shot 3:
Transition type: Fade
Transition rationale: [Reason]

... (List each transition)
```

**User confirmation point**: Display transition design, wait for user to confirm "continue" or adjust transitions.

---

### Stage 8: Integrate Cinematic Language

**Analyze narrative purpose for each shot**:
- narrative: Advance the plot
- emotional: Convey emotion
- atmospheric: Build environment
- rhythmic: Control rhythm

**Add visual metaphors for key shots** (if applicable):
- Example: High angle shot implies character trapped in dilemma
- Example: Backlit silhouette expresses mystery
- Example: Very slow push-in creates sense of oppression

**Output format**:
```
【Stage 8: Cinematic language】

Overall style: [Style description, 50 words]

Shot purpose analysis:

Shot 1:
Purpose: [narrative/emotional/atmospheric/rhythmic]
Purpose description: [Why, 30 words]
Visual metaphor: [If any, 30 words]

Shot 2:
...

(List each shot)
```

**User confirmation point**: Display cinematic language analysis, wait for user to confirm "continue" or adjust.

---

### Stage 9: Generate CinematographyStrategyCard

**Consolidate all designs** to generate the complete `CinematographyStrategyCard`.

**Output format**:
```json
{
  "cardType": "CinematographyStrategyCard",
  "sceneId": "第X集-第X场",
  "directorBriefingCardId": "card_director_briefing_epXX_scXX",
  "directorPrecheckSnapshot": {
    "primaryStructure": "dialogue_cross_cutting",
    "secondaryStructure": "close_up_micro_expression",
    "cinematographyDirective": "建立饭桌轴线、说话者近景、听者反应和关键物件插入镜头",
    "preliminaryShotGroupPlan": [
      {
        "groupNumber": 1,
        "corePurpose": "父亲宣布决定",
        "tentativeDuration": "8-12s"
      }
    ]
  },

  "shotList": [
    {
      "shotNumber": 1,
      "timestamp": 0,
      "duration": 3,
      "shotSize": "medium",
      "shotSizeDescription": "中景",
      "cameraMovement": {
        "type": "dolly",
        "typeDescription": "缓慢推进",
        "speed": "slow",
        "smoothness": "smooth",
        "description": "从中景缓慢推进至近景，使用Dolly配合电动数控轨道，平滑推进"
      },
      "cameraAngle": {
        "height": "eye-level",
        "heightDescription": "平视",
        "position": "three-quarter",
        "positionDescription": "斜侧"
      },
      "focusPoint": "林渊的脸部",
      "depthOfField": "shallow",
      "cameraParams": {
        "iso": 800,
        "aperture": "f/2.8",
        "shutter": "1/48",
        "colorTemperature": "5600K",
        "focalLength": "50mm"
      },
      "equipment": "Dolly + 电动数控轨道",
      "description": "中景起，从斜侧平视拍摄林渊半身，缓慢推进至近景，焦点锁定脸部，浅景深虚化背景，ISO 800保证室内光照充足，f/2.8光圈营造柔和氛围，色温5600K还原自然光，使用Dolly配合电动数控轨道实现平滑推进。"
    }
  ],

  "cinematicLanguage": {
    "overallStyle": "写实主义风格，注重真实光影和自然表演，镜头语言服务叙事",
    "purposes": [
      {
        "shotNumber": 1,
        "purpose": "narrative",
        "purposeDescription": "建立角色状态，引入场景",
        "visualMetaphor": "缓慢推进暗示逐渐揭示角色内心"
      }
    ],
    "transitions": [
      {
        "fromShot": 1,
        "toShot": 2,
        "type": "cut",
        "typeDescription": "切",
        "reason": "快节奏对话，保持紧张感"
      }
    ]
  },

  "userConfirmed": false,
  "notes": "拍摄策略已生成，请确认后可进入导演讲戏环节"
}
```

**Final confirmation**: Display the complete card, wait for user to confirm "complete" or request modifications.

---

## Translation Rule Library References

This skill depends on the following rule libraries (located in the `references/` directory):

1. `cinematography-styles.md` - Cinematography style library
2. `shot-size-rules.md` - Shot size selection rules
3. `camera-movement-rules.md` - Camera movement rules
4. `camera-angle-rules.md` - Camera angle rules
5. `transition-rules.md` - Transition method rules
6. `camera-equipment.md` - Camera equipment library

These rule libraries contain master-level professional knowledge and typical paradigms.

---

## Constraints

1. **Do not alter dialogue**: Strictly follow the original script text; do not add, delete, or modify dialogue
2. **Do not add music**: Do not create background music, do not add sound effect annotations
3. **Do not add characters**: Strictly follow the character list; do not arbitrarily add characters
4. **Character positions must match**: If SceneStrategyCard has position design, must strictly follow it
5. **Quality standard**: Full 8K Ultra HD, no blur, no artifacts
6. **Duration control**: Individual shots generally 2-8 seconds; total scene duration must not exceed estimated duration ±5 seconds
7. **Vertical composition**: All shots designed for 9:16 vertical
8. **Confirm at each stage**: After each stage is complete, must wait for user confirmation before proceeding

---

## Usage Example

**User input**:
```
Please design the shooting strategy for Episode 1 Scene 1
```

**Agent execution flow**:
1. Read EpisodeSceneDetailCard, Art Direction Card, SceneStrategyCard, PerformanceStrategyCard
2. Design progressively through 9 stages
3. After each stage, display results and wait for user confirmation
4. Finally generate `CinematographyStrategyCard`

---

## Notes

1. **Accurate professional terminology**: Use film industry standard terminology
2. **Reasonable parameters**: Camera parameters must conform to actual shooting logic
3. **Appropriate equipment**: Motion support equipment selection must match camera movement type
4. **Consistent style**: The shooting style for the entire scene must remain consistent
5. **Rhythm matching**: Shot switching rhythm must match the story's rhythm
6. **Emotion serving**: Shot sizes, camera movement, and angles must all serve emotional expression
7. **Dialogue priority**: Every character speaking a line must have a dedicated shot
8. **Reaction capture**: Important lines must be followed by reaction shots
9. **Relationship presentation**: Multi-person dialogue must have relationship shots
10. **User-first**: Wait for user confirmation at each stage; respect user's adjustment suggestions

## After Completion — Next Steps

Completion criteria: `CinematographyStrategyCard` has been created, shot sizes, camera movements, transitions, shot group suggestions, and equipment strategy have been confirmed.

After completion, must check the completion status of the three strategy cards: `SceneStrategyCard`, `PerformanceStrategyCard`, `CinematographyStrategyCard`.

- Only when all three strategy cards are complete should `director-briefing` be invoked for review and shot group finalization.
- If any strategy cards are still missing, recommend completing the remaining strategy cards.

Recommended dialogue: `Cinematography strategy design is complete. I will check the completion status of the three strategy cards; only when all three strategy cards are complete should we return to director-briefing for review and finalization.`


---

# References

## Reference: axis-continuity-rules

# 轴线、视线与镜头连续性


## 180度轴线

多人对话、对峙、打斗、追逐都要先建立轴线：

- A在屏幕左，B在屏幕右，反打时保持方向。
- 角色看向屏幕右，下一镜听者应从屏幕左接视线。
- 越轴必须有理由：可见运镜、正轴镜头、重新建立空间或角色绕行。

## 30度规则

同一主体连续切镜时，角度变化要足够明显。否则会像画面跳动。

可通过以下方式避免：

- 改变景别：MS -> CU。
- 改变角度：正面 -> 三分之二侧面。
- 插入物件：杯子、手、门把手、手机。
- 用动作衔接：match-on-action。

## 视线匹配

对话镜头检查：

- 谁在看谁？
- 说话者看向画面哪一侧？
- 听者反应是否接得上？
- 沉默者是否需要一个反应镜头？

## 运动方向

动作戏、逃跑、穿越空间：

- 起点、终点、入口、出口要明确。
- 屏幕方向要连续：一直向右跑，下一镜不能突然向左，除非有可见转弯。
- 角色进入门后，下一镜应从合理方向出现。

## Match-on-Action

一个动作切成两镜时：

```text
镜头1：中景开始伸手拿杯子。
镜头2：近景继续同一只手触到杯壁。
```

不要：

```text
镜头2重新开始伸手，或者杯子位置变了。
```

## 插入镜头

插入镜头用于：

- 长台词中给呼吸。
- 遮盖转场。
- 强调关键物件。
- 避免轴线混乱。
- 让情绪有落点。

插入物必须有叙事价值，不能为了装饰乱插。

## Reference: camera-angle-rules

# 镜头角度规则（Camera Angle Rules）

本文档定义镜头角度的具体含义、选择规则和心理暗示，供拍摄设计skill参考。

---

## 镜头角度定义

镜头角度由两个维度组成：
1. **垂直角度（Vertical Angle）**：高度关系（俯视/平视/仰视）
2. **水平位置（Horizontal Position）**：拍摄位置（正面/侧面/背面/斜侧）

---

## 垂直角度（Vertical Angle）

### 1. 俯视（High Angle / Bird's Eye View）

**角度范围**：
- **微俯**：15-30度，轻微俯视
- **中俯**：30-60度，明显俯视
- **大俯**：60-90度，垂直俯视（鸟瞰）

**心理暗示**：
- 弱势、无助、被压迫
- 渺小、脆弱、卑微
- 全局视角、客观呈现
- 失去控制、陷入困境

**适用场景**：
- 角色处于弱势地位
- 展示环境全貌
- 角色陷入困境
- 多人场景的空间关系
- 客观叙事视角

**情绪匹配**：
- 无助、绝望、恐惧
- 迷茫、困惑
- 被动、受制

**9:16竖屏适配**：
- 竖屏俯视强化压迫感
- 人物从上往下展示
- 适合展示人物全身

**常见组合**：
- 俯视 + 远景/全景 = 展示环境
- 俯视 + 近景 = 强化弱势感
- 俯视 + 特写 = 极度压迫

---

### 2. 平视（Eye Level）

**角度范围**：
- 与人物眼睛同高（±15度）

**心理暗示**：
- 平等、客观、真实
- 中立、自然、日常
- 观众视角、代入感
- 无偏向性

**适用场景**：
- 对话场景（最常用）
- 日常生活
- 客观叙事
- 建立真实感

**情绪匹配**：
- 所有情绪（中性视角）
- 自然、真实的情感表达

**9:16竖屏适配**：
- 竖屏最常用角度
- 人物脸部位于画面中央
- 最符合日常视角

**常见组合**：
- 平视 + 中景 = 对话标准
- 平视 + 近景 = 情绪表达
- 平视 + 全景 = 环境呈现

---

### 3. 仰视（Low Angle）

**角度范围**：
- **微仰**：15-30度，轻微仰视
- **中仰**：30-60度，明显仰视
- **大仰**：60-90度，极端仰视

**心理暗示**：
- 强势、威严、权威
- 高大、崇高、英雄感
- 主动、控制、压迫
- 仰慕、敬畏

**适用场景**：
- 角色处于强势地位
- 展示人物高大形象
- 权力关系呈现
- 英雄出场
- 威胁场景

**情绪匹配**：
- 愤怒、霸气、自信
- 威严、压迫
- 崇高、庄严

**9:16竖屏适配**：
- 竖屏仰视极度强化高大感
- 人物从下往上展示
- 天空/背景占据上方空间

**常见组合**：
- 仰视 + 全景 = 展示高大
- 仰视 + 近景 = 强化威严
- 仰视 + 特写 = 极度压迫感

---

## 水平位置（Horizontal Position）

### 1. 正面（Front / Frontal）

**拍摄位置**：
- 直接面对主体
- 0度角

**心理暗示**：
- 直接、正式、严肃
- 对抗、挑战
- 坦诚、开放
- 注视、审视

**适用场景**：
- 正式对话
- 对抗场面
- 角色宣言
- 第四墙打破（直视观众）
- 证件照式呈现

**特点**：
- 对称构图
- 强烈视觉冲击
- 缺乏纵深
- 仪式感强

**9:16竖屏适配**：
- 竖屏正面构图对称性强
- 适合单人特写
- 强烈的注视感

---

### 2. 斜侧（Three-Quarter / Oblique）

**拍摄位置**：
- 30-60度角
- 斜侧方拍摄

**心理暗示**：
- 自然、生动、真实
- 有层次、有深度
- 非正式、轻松
- 观察、窥视

**适用场景**：
- 日常对话（最常用）
- 生活化场景
- 自然呈现
- 所有常规场景

**特点**：
- 最自然的拍摄角度
- 有纵深感
- 构图灵活
- 适用范围最广

**9:16竖屏适配**：
- 竖屏最常用水平位置
- 保留环境信息
- 构图舒适自然

---

### 3. 侧面（Side / Profile）

**拍摄位置**：
- 90度角
- 完全侧面

**心理暗示**：
- 剖面、轮廓
- 并行、平等（侧对侧）
- 分离、独立
- 经典、艺术感

**适用场景**：
- 展示轮廓
- 两人并排
- 行走场景
- 艺术化呈现
- 经典构图

**特点**：
- 轮廓线清晰
- 二维感强
- 艺术性高
- 适合展示侧脸

**9:16竖屏适配**：
- 竖屏侧面需注意前后景
- 适合单人行走
- 强调轮廓美

---

### 4. 背面（Back / Rear）

**拍摄位置**：
- 从后方拍摄
- 180度角

**心理暗示**：
- 神秘、未知
- 主观、跟随
- 疏离、孤独
- 隐藏、保留

**适用场景**：
- 角色离开
- 主观跟随
- 神秘感营造
- 背影杀
- 隐藏身份

**特点**：
- 隐藏表情
- 强化神秘感
- 引导视线
- 跟随视角

**9:16竖屏适配**：
- 竖屏背面强调孤独感
- 适合展示离开
- 人物与环境对比

---

## 角度组合与心理暗示

### 垂直+水平组合效果表

| 垂直角度 | 水平位置 | 组合效果 | 适用场景 |
|---------|---------|---------|---------|
| 俯视 | 正面 | 弱势+对抗 | 被审判、被质问 |
| 俯视 | 斜侧 | 弱势+观察 | 角色困境的客观呈现 |
| 俯视 | 侧面 | 弱势+剖面 | 孤立无援 |
| 俯视 | 背面 | 弱势+疏离 | 绝望离开 |
| 平视 | 正面 | 平等+直接 | 对话、宣言 |
| 平视 | 斜侧 | 平等+自然 | 日常对话（最常用） |
| 平视 | 侧面 | 平等+并行 | 并肩行走 |
| 平视 | 背面 | 平等+跟随 | 主观跟随 |
| 仰视 | 正面 | 强势+压迫 | 威胁、权威 |
| 仰视 | 斜侧 | 强势+观察 | 仰慕视角 |
| 仰视 | 侧面 | 强势+轮廓 | 英雄侧脸 |
| 仰视 | 背面 | 强势+神秘 | 大佬背影 |

---

## 角度选择规则矩阵

### 基于角色关系

| 角色关系 | 推荐角度 | 原因 |
|---------|---------|------|
| 权力强势方 | 仰视 + 正面/斜侧 | 展示威严 |
| 权力弱势方 | 俯视 + 正面/斜侧 | 展示弱势 |
| 平等关系 | 平视 + 斜侧 | 自然对话 |
| 对抗关系 | 平视 + 正面 | 直接对抗 |
| 跟随关系 | 平视 + 背面 | 跟随视角 |
| 观察关系 | 平视/俯视 + 斜侧 | 客观观察 |

### 基于情绪状态

| 情绪状态 | 推荐角度 | 原因 |
|---------|---------|------|
| 自信、霸气 | 仰视 + 正面/斜侧 | 强化气场 |
| 恐惧、无助 | 俯视 + 正面/斜侧 | 强化弱势 |
| 愤怒、对抗 | 平视/仰视 + 正面 | 直接冲突 |
| 悲伤、孤独 | 俯视/平视 + 侧面/背面 | 疏离感 |
| 日常、平静 | 平视 + 斜侧 | 自然真实 |
| 神秘、隐藏 | 平视 + 背面 | 保留信息 |

### 基于叙事目的

| 叙事目的 | 推荐角度 | 原因 |
|---------|---------|------|
| 建立权力关系 | 仰视/俯视 | 高度差异 |
| 自然对话 | 平视 + 斜侧 | 最自然 |
| 展示环境 | 俯视 + 全方位 | 全局视角 |
| 情感表达 | 平视 + 正面/斜侧 | 捕捉表情 |
| 营造神秘 | 平视 + 背面 | 隐藏信息 |
| 艺术化呈现 | 侧面 | 轮廓美感 |

---

## 特殊角度技法

### 1. 倾斜构图（Dutch Angle / Canted Angle）

**角度特征**：
- 水平线倾斜
- 画面失衡

**心理暗示**：
- 不安、混乱、失衡
- 心理异常、梦境
- 紧张、不稳定

**适用场景**：
- 心理异常
- 混乱场景
- 梦境、幻觉
- 极度紧张

**9:16竖屏适配**：
- 竖屏倾斜冲击力更强
- 人物失衡感明显
- 慎用（容易过度）

---

### 2. 主观视角（POV - Point of View）

**角度特征**：
- 模拟角色视角
- 观众看到角色看到的

**心理暗示**：
- 强烈代入感
- 主观体验
- 角色视角

**适用场景**：
- 第一人称体验
- 角色观察
- 惊吓时刻
- 发现场景

**9:16竖屏适配**：
- 竖屏POV更贴近手机视角
- 天然的第一人称感
- 适合代入式叙事

---

### 3. 上帝视角（God's Eye View / Overhead）

**角度特征**：
- 完全垂直俯视
- 90度俯瞰

**心理暗示**：
- 全知视角
- 命运感、宿命感
- 渺小、宏大对比

**适用场景**：
- 开场/结尾
- 命运时刻
- 艺术化呈现
- 展示空间布局

**9:16竖屏适配**：
- 竖屏上帝视角人物居中
- 周围环境环绕
- 强烈的宿命感

---

## 对话场景角度规则

### 两人对话（Over-The-Shoulder / Reverse Shot）

**标准配置**：
```
镜头1：平视 + 斜侧（过肩镜头，A肩部+B脸）
镜头2：平视 + 斜侧（反打，B肩部+A脸）
镜头3：平视 + 正面/斜侧（近景，A）
镜头4：平视 + 正面/斜侧（近景，B）
```

**权力关系不平等**：
```
镜头1：仰视 + 正面（强势方A）
镜头2：俯视 + 正面（弱势方B）
镜头3：仰视 + 正面（强势方A）
镜头4：俯视 + 正面（弱势方B）
```

### 多人对话

**环形布局**：
```
镜头1：平视 + 正面（说话者）
镜头2：平视 + 斜侧（听者群）
镜头3：俯视 + 全局（展示空间关系）
```

---

## 动作场景角度规则

### 打斗场景

**标准配置**：
```
镜头1：平视 + 侧面（展示完整动作）
镜头2：平视 + 正面（击打瞬间）
镜头3：俯视 + 全局（空间关系）
镜头4：仰视 + 斜侧（英雄角度）
```

### 追逐场景

**标准配置**：
```
镜头1：平视 + 背面（跟随逃跑者）
镜头2：平视 + 正面（面对追赶者）
镜头3：俯视 + 全局（空间关系）
镜头4：平视 + 侧面（并行追逐）
```

---

## 竖屏角度特殊规则

### 9:16构图调整

1. **俯视角度**：
   - 竖屏俯视压迫感更强
   - 人物从上往下延伸
   - 适合全身展示

2. **平视角度**：
   - 竖屏最常用角度
   - 人物脸部居中
   - 上下留白适中

3. **仰视角度**：
   - 竖屏仰视高大感极强
   - 人物从下往上延伸
   - 天空背景占据上方

4. **倾斜构图**：
   - 竖屏倾斜冲击力更强
   - 慎用（容易过度）
   - 适合心理异常戏

5. **主观视角**：
   - 竖屏天然适合POV
   - 贴近手机使用视角
   - 代入感强

---

## 角度设计检查清单

设计镜头角度时，检查以下问题：

- [ ] 角度是否匹配角色关系？
- [ ] 角度是否匹配情绪状态？
- [ ] 角度是否服务叙事目的？
- [ ] 对话场景是否使用过肩/反打？
- [ ] 权力关系是否通过角度呈现？
- [ ] 角度切换是否流畅？
- [ ] 特殊角度（倾斜、POV）是否必要？
- [ ] 竖屏角度是否适配？
- [ ] 角度是否与景别、运镜协同？

---

## 常见错误

### ❌ 错误1：角度单一
整场戏只用平视 + 斜侧

**正确做法**：根据情绪和关系灵活调整角度

### ❌ 错误2：权力关系不明
强弱对话用同样角度

**正确做法**：强势方用仰视，弱势方用俯视

### ❌ 错误3：倾斜构图滥用
大量使用倾斜构图

**正确做法**：倾斜构图只用于极度紧张/心理异常场景

### ❌ 错误4：对话无过肩
两人对话全是单人镜头

**正确做法**：用过肩镜头建立空间关系

### ❌ 错误5：角度跳跃过大
平视突然切极端仰视

**正确做法**：角度渐进切换，或在转折时刻用对比切换

---

## 角度与光影配合

| 角度 | 推荐光位 | 效果 |
|-----|---------|------|
| 俯视 | 顶光 | 强化压迫感 |
| 俯视 | 侧光 | 展示轮廓 |
| 平视 | 正面光/侧光 | 自然呈现 |
| 仰视 | 逆光/底光 | 英雄感/威严 |
| 侧面 | 侧光/逆光 | 轮廓美感 |
| 背面 | 逆光 | 剪影效果 |

---

## 使用建议

拍摄设计skill在设计角度时：

1. **优先考虑关系**：权力关系决定垂直角度
2. **情绪状态匹配**：情绪决定角度选择
3. **平视+斜侧最常用**：占60-70%
4. **对话场景标准**：过肩+反打+单人近景
5. **权力关系呈现**：仰视/俯视对比
6. **特殊角度慎用**：倾斜、上帝视角不超过5%
7. **竖屏角度适配**：注意纵向空间特性
8. **角度与景别协同**：近景配斜侧，全景配俯视

---

**版本**：v1.0  
**最后更新**：2026-06-03

## Reference: camera-equipment

# 摄影器材库（Camera Equipment）

本文档包含电影级摄影器材的详细信息，供拍摄设计skill参考。

---

## 摄影机（Camera）

### ARRI ALEXA 65
**类型**：65mm大画幅数字电影摄影机  
**传感器尺寸**：54.12 x 25.58mm  
**分辨率**：6560 x 3100（6.5K）  
**画幅比**：2.39:1 / 1.85:1 / 16:9 / 9:16  
**ISO范围**：160-3200（原生800）  
**动态范围**：14+ stops  
**帧率**：0.75-60fps（6.5K）  
**特点**：
- 大画幅带来浅景深和电影感
- 色彩科学顶级
- 低光性能优秀
- 适合高端影视制作

**适用场景**：所有高端电影级拍摄

---

## 镜头组（Lenses）

### ARRI Signature Prime 镜头组
**类型**：定焦电影镜头  
**焦段覆盖**：12mm, 15mm, 18mm, 21mm, 25mm, 29mm, 35mm, 40mm, 47mm, 58mm, 75mm, 95mm, 125mm, 150mm, 180mm, 280mm  
**最大光圈**：T1.8（大部分焦段）  
**特点**：
- 柔和、自然的焦外成像
- 优秀的呼吸效应控制
- 统一的色彩表现
- 适合大画幅摄影机

**常用焦段与用途**：

| 焦段 | 景别 | 用途 |
|-----|-----|------|
| 12-18mm | 远景/全景 | 环境展示、空间感 |
| 21-29mm | 全景/中全景 | 动作场面、空间关系 |
| 35-47mm | 中景 | 对话场景、日常叙事 |
| 58-75mm | 近景 | 人物特写、情绪表达 |
| 95-150mm | 特写 | 细节捕捉、浅景深 |
| 180-280mm | 特写 | 极致浅景深、压缩空间 |

---

## 运动辅助器材

### 1. 稳定系统

#### 三脚架（Tripod）
**类型**：静态支撑系统  
**特点**：
- 绝对稳定
- 承重能力强
- 可精确调整高度和角度

**适用运镜**：
- 固定镜头
- 缓慢摇镜/倾斜
- 需要绝对稳定的镜头

**推荐型号**：
- Sachtler Video 60 Plus（重型）
- Manfrotto 546B（中型）

---

#### 手持稳定器（Handheld Stabilizer）
**类型**：手持云台稳定系统  
**特点**：
- 手持灵活性
- 电子稳定
- 三轴增稳

**适用运镜**：
- 手持拍摄（稳定版）
- 跟拍
- 灵活移动

**推荐型号**：
- DJI Ronin 4D
- ARRI Trinity

---

#### 斯坦尼康（Steadicam）
**类型**：机械平衡稳定系统  
**特点**：
- 平滑流畅
- 灵活自如
- 保留轻微人性化晃动
- 需要专业操作员

**适用运镜**：
- 跟拍
- 环绕
- 长镜头
- 复杂路径移动

**推荐型号**：
- Tiffen Steadicam Ultra 2
- Steadicam Volt

---

### 2. 轨道系统

#### 直线滑轨（Slider / Linear Track）
**类型**：短距离直线轨道  
**长度**：0.5-2米  
**特点**：
- 便携
- 快速架设
- 适合短距离移动

**适用运镜**：
- 推拉镜（短距离）
- 滑轨移动
- 微妙视角变化

**推荐型号**：
- Rhino Slider Pro（1.2米）
- Edelkrone SliderPLUS（可扩展）

---

#### 重型电影轨道（Dolly Track）
**类型**：长距离直线轨道  
**长度**：3-20米+  
**特点**：
- 极度平滑
- 承重能力强
- 适合长距离移动

**适用运镜**：
- 推拉镜（长距离）
- 极缓推/拉
- 需要绝对平滑的移动

**推荐型号**：
- J.L. Fisher Model 10
- Chapman PeeWee IV

---

#### 弧形轨道（Curved Track）
**类型**：弧线轨道  
**特点**：
- 弧线运动
- 可调曲率
- 适合环绕运动

**适用运镜**：
- 环绕镜头
- 半环绕
- 弧线移动

**推荐型号**：
- Matthews Studio Equipment Curved Track

---

#### 环形轨道（Circular Track）
**类型**：完整圆形轨道  
**特点**：
- 360度环绕
- 可重复运动
- 适合完整环绕

**适用运镜**：
- 完整环绕镜头
- 多圈旋转
- 可重复的环绕运动

---

#### 十字轨道（Cross Track）
**类型**：交叉轨道系统  
**特点**：
- 可前后、左右移动
- 复杂路径
- 灵活调度

**适用运镜**：
- 复杂移动路径
- 多方向移动
- 精确位置控制

---

#### 电动数控轨道（Motion Control Track）
**类型**：可编程电动轨道  
**特点**：
- 可编程运动
- 可重复
- 精确控制速度和位置
- 适合特效合成

**适用运镜**：
- 需要精确重复的运动
- 慢动作镜头
- 特效镜头
- 极缓推/拉

**推荐型号**：
- Mark Roberts Motion Control (MRMC)
- Technodolly

---

### 3. 摇臂系统

#### 大型电影摇臂（Camera Crane）
**类型**：大型升降摇臂  
**臂长**：3-15米+  
**特点**：
- 大幅度升降
- 承重能力强
- 需要操作员和助手

**适用运镜**：
- 大幅度升降
- 开场/结尾
- 宏大场面

**推荐型号**：
- Technocrane（15米）
- SuperTechno 50（15米）

---

#### 电控小摇臂（Remote Head / Mini Crane）
**类型**：小型电控摇臂  
**臂长**：1-3米  
**特点**：
- 灵活
- 快速架设
- 远程控制

**适用运镜**：
- 小幅度升降
- 微调高度
- 过肩镜头

**推荐型号**：
- DJI Ronin 2 on jib
- Kessler Pocket Jib

---

#### 升降摇臂（Lift Arm）
**类型**：纯升降摇臂  
**特点**：
- 垂直升降为主
- 可配合推拉

**适用运镜**：
- 垂直升降
- 高度变化

---

#### 车载摇臂（Vehicle-Mounted Crane）
**类型**：安装在车辆上的摇臂  
**特点**：
- 移动+升降
- 大范围运动
- 复杂复合运动

**适用运镜**：
- 追车戏
- 大范围跟拍
- 复合运动

**推荐型号**：
- Russian Arm
- Ultimate Arm

---

### 4. 移动平台

#### Dolly
**类型**：移动平台推车  
**特点**：
- 平滑推拉
- 可配合轨道或自由移动
- 可升降（部分型号）

**适用运镜**：
- 推拉镜
- 跟拍
- 平滑移动

**推荐型号**：
- Chapman PeeWee Dolly
- J.L. Fisher Model 10

---

#### 跟拍轨道车（Tracking Vehicle）
**类型**：跟拍专用车辆  
**特点**：
- 长距离跟拍
- 高速跟随
- 稳定平滑

**适用运镜**：
- 长距离跟拍
- 追车戏
- 高速移动

**推荐型号**：
- Tracking Vehicle with Libra Head
- Camera Car

---

#### 低位滑轮车（Low Mode Dolly）
**类型**：低位移动平台  
**特点**：
- 低角度拍摄
- 贴近地面
- 灵活移动

**适用运镜**：
- 低位跟拍
- 地面视角
- 动物视角

---

### 5. 特殊系统

#### MOCO机械臂（Motion Control Robot Arm）
**类型**：可编程机械臂  
**特点**：
- 六轴运动
- 可编程
- 可精确重复
- 复杂三维运动

**适用运镜**：
- 精确复合运动
- 特效镜头
- 产品拍摄
- 极缓复杂运动

**推荐型号**：
- KUKA Robot Arm
- MRMC Bolt

---

#### 飞猫索道系统（Spidercam / Cable Cam）
**类型**：索道悬挂摄影系统  
**特点**：
- 三维空间自由移动
- 高速移动
- 可覆盖大范围

**适用运镜**：
- 高速飞行镜头
- 体育赛事
- 大场面俯瞰
- 三维空间移动

**推荐型号**：
- Spidercam
- CableCam

---

#### 航拍系统（Aerial / Drone）
**类型**：无人机航拍  
**特点**：
- 空中视角
- 高度自由
- 灵活机动

**适用运镜**：
- 航拍
- 鸟瞰
- 大场面展示
- 追车戏（空中视角）

**推荐型号**：
- DJI Inspire 3
- Freefly Alta X

---

#### 穿梭机（Pursuit Vehicle System）
**类型**：高速穿梭拍摄系统  
**特点**：
- 极速移动
- 穿越场景
- 动态跟拍

**适用运镜**：
- 极速穿越
- 追逐场面
- 动态展示

---

### 6. 云台系统

#### 电控旋转云台（Pan/Tilt Head）
**类型**：电控云台  
**特点**：
- 精确控制摇镜/倾斜
- 可编程
- 远程控制

**适用运镜**：
- 精确摇镜
- 精确倾斜
- 自动跟踪

**推荐型号**：
- Cartoni Lambda
- Sachtler Cine 30

---

#### 俯仰云台（Tilt Head）
**类型**：俯仰专用云台  
**特点**：
- 精确俯仰控制
- 平滑倾斜

**适用运镜**：
- 倾斜镜头
- 垂直扫视

---

#### 液压云台（Fluid Head）
**类型**：液压阻尼云台  
**特点**：
- 极度平滑
- 阻尼可调
- 适合手动操作

**适用运镜**：
- 手动摇镜/倾斜
- 平滑运动

**推荐型号**：
- Sachtler Video 60 Plus
- Vinten Vision Blue

---

### 7. 升降系统

#### 液压升降架（Hydraulic Lift）
**类型**：液压升降平台  
**高度**：1-10米+  
**特点**：
- 大幅度升降
- 稳定平滑
- 承重能力强

**适用运镜**：
- 大幅度升降
- 高位拍摄
- 低位拍摄

**推荐型号**：
- Genie Super Tower
- JLG Boom Lift

---

#### 天轨（Overhead Track）
**类型**：悬挂轨道系统  
**特点**：
- 悬挂在空中
- 可跨越障碍
- 高位移动

**适用运镜**：
- 高位跟拍
- 跨越障碍
- 鸟瞰移动

---

#### 地轨（Ground Track）
**类型**：地面轨道系统  
**特点**：
- 贴近地面
- 低位移动

**适用运镜**：
- 低位跟拍
- 地面视角

---

#### 悬空轨道（Suspended Track）
**类型**：悬挂轨道系统  
**特点**：
- 三维空间移动
- 不受地面限制

**适用运镜**：
- 三维空间移动
- 复杂路径

---

## 器材选择决策树

### 步骤1：确定运镜类型

```
固定镜头 → 三脚架
推拉镜头 → 步骤2
摇镜/倾斜 → 三脚架 + 液压云台
跟拍 → 步骤3
环绕 → 步骤4
升降 → 步骤5
手持 → 步骤6
复杂运动 → 步骤7
```

### 步骤2：推拉镜头选择

```
距离 < 2米 → 直线滑轨
距离 2-5米 → Dolly + 短轨道
距离 > 5米 → 重型电影轨道
需要极度平滑 → 电动数控轨道
需要可重复 → 电动数控轨道
```

### 步骤3：跟拍选择

```
短距离 + 灵活 → 斯坦尼康
中距离 + 平滑 → Dolly + 轨道
长距离 + 高速 → 跟拍轨道车
低位 → 低位滑轮车
需要稳定 → 手持稳定器
```

### 步骤4：环绕选择

```
半环绕（<180度）→ 弧形轨道
完整环绕（360度）→ 环形轨道
灵活环绕 → 斯坦尼康
可重复环绕 → 电动数控轨道 + 弧形轨道
```

### 步骤5：升降选择

```
小幅度（<3米）→ 电控小摇臂
中幅度（3-10米）→ 大型电影摇臂
大幅度（>10米）→ 液压升降架
需要移动+升降 → 车载摇臂
```

### 步骤6：手持选择

```
需要稳定 → 专业手持云台稳定器
需要灵活 → 斯坦尼康
需要真实感 → 纯手持（无辅助）
```

### 步骤7：复杂运动选择

```
三维空间移动 → 飞猫索道系统
精确可重复 → MOCO机械臂
空中视角 → 航拍系统
极速穿越 → 穿梭机
多方向移动 → 十字轨道
```

---

## 竖屏器材适配

### 9:16构图器材建议

1. **三脚架**：
   - 最常用器材（40-50%）
   - 竖屏固定镜头主力

2. **直线滑轨**：
   - 前后滑动效果好
   - 横向滑动受限

3. **手持稳定器**：
   - 竖屏手持真实感强
   - 需控制晃动

4. **斯坦尼康**：
   - 竖屏跟拍效果好
   - 保持人物居中

5. **Dolly**：
   - 竖屏推拉主力器材
   - 聚焦人物快

6. **摇臂**：
   - 纵向升降效果明显
   - 适合竖屏空间

7. **飞猫/航拍**：
   - 竖屏鸟瞰效果好
   - 纵向空间展示

---

## 器材配置建议

### 最小配置（小成本短剧）

```
基础配置：
- 三脚架（Manfrotto）
- 手持稳定器（DJI Ronin）
- 直线滑轨（1.2米）

覆盖运镜：
- 固定、摇镜、倾斜
- 手持、跟拍
- 短距离推拉
```

### 标准配置（中成本短剧）

```
基础配置 +
- 斯坦尼康
- Dolly + 轨道（5米）
- 电控小摇臂

覆盖运镜：
- 以上所有
- 长距离跟拍
- 环绕（有限）
- 小幅度升降
```

### 高端配置（高成本短剧）

```
标准配置 +
- 重型电影轨道（10米+）
- 弧形/环形轨道
- 大型电影摇臂
- 电动数控轨道
- 航拍系统
- MOCO机械臂

覆盖运镜：
- 所有运镜类型
- 复杂复合运动
- 精确可重复运动
```

---

## 器材使用注意事项

### 1. 安全第一
- 大型器材需专业操作员
- 检查承重能力
- 确保稳固安全

### 2. 场地要求
- 轨道系统需平整地面
- 摇臂需足够空间
- 航拍需开阔环境

### 3. 时间成本
- 大型器材架设时间长
- 平衡拍摄效率和质量
- 简单镜头用简单器材

### 4. 器材匹配
- 器材匹配运镜类型
- 器材匹配拍摄环境
- 器材匹配预算

---

## 使用建议

拍摄设计skill在选择器材时：

1. **根据运镜类型选择**：参考决策树
2. **考虑拍摄环境**：室内/室外、空间大小
3. **平衡成本效率**：简单镜头用简单器材
4. **竖屏适配**：注意纵向空间特性
5. **安全第一**：大型器材需专业操作
6. **预留备选**：主器材+备选器材
7. **器材组合**：可组合使用（Dolly+摇臂）

---

**版本**：v1.0  
**最后更新**：2026-06-03

## Reference: camera-movement-rules

# 运镜方式规则（Camera Movement Rules）

本文档定义运镜方式的具体含义、选择规则和运动辅助器材，供拍摄设计skill参考。

---

## 运镜方式定义

### 1. 推镜（Push In / Dolly In）
**运动方式**：摄影机向前移动，靠近主体  
**英文名称**：Push In / Dolly In  
**中文名称**：推镜 / 推进

**作用**：
- 引导观众注意力
- 逐渐聚焦主体
- 情绪逐渐强化
- 制造紧张感或亲密感

**速度分类**：
- **极缓推**：10秒以上推进，营造压迫感或沉浸感
- **缓推**：5-10秒推进，自然引导注意力
- **中速推**：3-5秒推进，保持节奏感
- **快速推**：1-3秒推进，制造紧张感
- **冲刺推**：<1秒推进，强烈冲击感

**适用场景**：
- 情绪上升
- 聚焦关键信息
- 角色内心变化
- 紧张时刻

**运动辅助器材**：
- 慢速：重型电影轨道、电动数控轨道
- 中速：Dolly、直线滑轨
- 快速：手持、斯坦尼康

---

### 2. 拉镜（Pull Back / Dolly Out）
**运动方式**：摄影机向后移动，远离主体  
**英文名称**：Pull Back / Dolly Out  
**中文名称**：拉镜 / 拉开

**作用**：
- 揭示更多信息
- 情绪释放或疏离
- 展示环境背景
- 营造孤独感

**速度分类**：
- **极缓拉**：10秒以上，营造疏离感
- **缓拉**：5-10秒，自然展示环境
- **中速拉**：3-5秒，保持节奏
- **快速拉**：1-3秒，制造震撼
- **暴力拉**：<1秒，强烈冲击（配合转折）

**适用场景**：
- 情绪下降
- 揭示真相
- 环境展示
- 角色孤立

**运动辅助器材**：
- 慢速：重型电影轨道、电动数控轨道
- 中速：Dolly、直线滑轨
- 快速：手持、斯坦尼康

---

### 3. 摇镜（Pan）
**运动方式**：摄影机水平旋转，左右扫视  
**英文名称**：Pan  
**中文名称**：摇镜 / 横摇

**作用**：
- 展示空间关系
- 跟随角色移动
- 连接不同主体
- 揭示信息

**速度分类**：
- **极缓摇**：>10秒，展示宏大场景
- **缓摇**：5-10秒，自然扫视
- **中速摇**：2-5秒，常规跟随
- **快摇**：1-2秒，快速切换
- **甩镜**：<1秒，模糊过渡（Whip Pan）

**适用场景**：
- 角色对话切换
- 空间展示
- 动作跟随
- 快节奏场景

**运动辅助器材**：
- 慢速：三脚架、电控旋转云台
- 中速：液压云台、手持云台
- 快速：手持、斯坦尼康

---

### 4. 倾斜（Tilt）
**运动方式**：摄影机垂直旋转，上下扫视  
**英文名称**：Tilt  
**中文名称**：倾斜 / 纵摇

**作用**：
- 展示垂直空间
- 从脚到头或从头到脚展示人物
- 强调高度差异
- 揭示上下空间关系

**速度分类**：
- **极缓倾**：>10秒，展示建筑/高度
- **缓倾**：5-10秒，自然扫视
- **中速倾**：2-5秒，常规展示
- **快倾**：1-2秒，快速切换

**适用场景**：
- 建筑展示
- 人物登场（从脚到头）
- 高度对比
- 垂直空间展示

**运动辅助器材**：
- 慢速：三脚架、俯仰云台
- 中速：液压云台、手持云台
- 快速：手持、斯坦尼康

---

### 5. 跟拍（Tracking / Follow）
**运动方式**：摄影机跟随移动主体  
**英文名称**：Tracking / Follow Shot  
**中文名称**：跟拍 / 跟随镜头

**作用**：
- 保持主体在画面中
- 营造沉浸感
- 展示移动过程
- 动态叙事

**跟随方式**：
- **侧跟**：摄影机在侧面跟随
- **前跟**：摄影机在前面后退跟随
- **后跟**：摄影机在后面跟随
- **环绕跟**：摄影机环绕跟随

**适用场景**：
- 角色走路
- 追逐场景
- 动作场面
- 沉浸式跟随

**运动辅助器材**：
- 慢速：直线滑轨、地轨
- 中速：跟拍轨道车、斯坦尼康
- 快速：手持、专业手持云台稳定器

---

### 6. 环绕（Orbit / Circle）
**运动方式**：摄影机围绕主体旋转  
**英文名称**：Orbit / Circle Shot  
**中文名称**：环绕镜头 / 旋转镜头

**作用**：
- 展示主体360度全貌
- 营造戏剧化效果
- 强调关键时刻
- 时间感营造

**旋转方式**：
- **顺时针环绕**：常规旋转
- **逆时针环绕**：反向旋转
- **半环绕**：180度旋转
- **多圈环绕**：持续旋转（配合慢动作）

**适用场景**：
- 角色情绪爆发
- 关键转折
- 对峙场面
- 展示人物全貌

**运动辅助器材**：
- 慢速：弧形轨道、环形轨道
- 中速：电动数控轨道、MOCO机械臂
- 快速：斯坦尼康、飞猫索道

---

### 7. 升降（Crane / Boom）
**运动方式**：摄影机垂直升高或降低  
**英文名称**：Crane / Boom  
**中文名称**：升降镜头 / 摇臂镜头

**作用**：
- 改变视角高度
- 展示空间层次
- 营造宏大感
- 揭示或隐藏信息

**运动方式**：
- **上升**：从低到高，展示全貌或结束
- **下降**：从高到低，聚焦或进入
- **上升+推进**：复合运动
- **下降+拉开**：复合运动

**适用场景**：
- 开场/结尾
- 空间展示
- 情绪转换
- 视角切换

**运动辅助器材**：
- 小幅升降：升降摇臂、电控小摇臂
- 中幅升降：大型电影摇臂、车载摇臂
- 大幅升降：天轨、液压升降架、航拍

---

### 8. 固定（Static）
**运动方式**：摄影机完全静止  
**英文名称**：Static Shot  
**中文名称**：固定镜头

**作用**：
- 客观呈现
- 营造稳定感
- 强调画面构图
- 给观众喘息空间

**变体**：
- **绝对固定**：三脚架，完全静止
- **微动固定**：轻微手持晃动
- **长镜头**：固定长时间拍摄

**适用场景**：
- 对话场景
- 静态场面
- 情绪沉淀
- 观察视角

**运动辅助器材**：
- 三脚架
- 重型三脚架（极度稳定）
- 手持（模拟固定，略有晃动）

---

### 9. 手持（Handheld）
**运动方式**：手持摄影机，保留自然晃动  
**英文名称**：Handheld  
**中文名称**：手持镜头

**作用**：
- 营造真实感
- 制造紧张感
- 纪实风格
- 主观视角

**晃动程度**：
- **极度稳定手持**：使用手持云台稳定器，几乎无晃动
- **稳定手持**：使用斯坦尼康，轻微晃动
- **自然手持**：手持，自然晃动
- **粗糙手持**：强烈晃动，纪实感极强

**适用场景**：
- 动作场面
- 混乱场景
- 追逐戏
- 第一人称视角

**运动辅助器材**：
- 专业手持云台稳定器
- 斯坦尼康
- 纯手持（无辅助）

---

### 10. 滑轨（Slider）
**运动方式**：摄影机在短距离轨道上移动  
**英文名称**：Slider Shot  
**中文名称**：滑轨镜头

**作用**：
- 平滑短距离移动
- 增加画面动感
- 微妙视角变化
- 展示纵深层次

**移动方式**：
- **左右滑动**：横向移动
- **前后滑动**：纵向移动
- **斜向滑动**：对角线移动

**适用场景**：
- 对话场景增加动感
- 静物展示
- 微妙情绪变化
- 空间层次展示

**运动辅助器材**：
- 直线滑轨（短距离，1-2米）
- 电动滑轨（可编程）

---

### 11. 飞猫（Cable Cam）
**运动方式**：摄影机悬挂在钢丝索道上高速移动  
**英文名称**：Cable Cam / Spidercam  
**中文名称**：飞猫 / 索道摄影

**作用**：
- 极速移动
- 鸟瞰视角
- 三维空间移动
- 动作跟随

**适用场景**：
- 武打动作
- 追逐场面
- 宏大场景
- 飞行镜头

**运动辅助器材**：
- 飞猫索道系统
- 钢丝索道摄影
- 轨道飞猫

---

### 12. 航拍（Aerial）
**运动方式**：无人机或直升机航拍  
**英文名称**：Aerial Shot / Drone Shot  
**中文名称**：航拍镜头

**作用**：
- 鸟瞰视角
- 宏大场面
- 空间展示
- 高空视角

**适用场景**：
- 建立镜头
- 环境展示
- 追逐场面（空中视角）
- 宏大场景

**运动辅助器材**：
- 航拍无人机

---

## 运镜选择规则矩阵

### 基于节奏与情绪强度

| 节奏 | 情绪强度 | 推荐运镜 | 速度 | 器材 |
|-----|---------|---------|------|------|
| fast | 9-10 | 快速推进、甩镜、冲刺推 | fast | 手持、斯坦尼康 |
| fast | 7-8 | 快速推进、快摇、手持跟拍 | fast | 手持、专业手持云台 |
| fast | 5-6 | 中速推进、中速摇、跟拍 | medium | 滑轨、斯坦尼康 |
| medium | 7-8 | 缓推、环绕、升降 | medium | Dolly、弧形轨道、摇臂 |
| medium | 5-6 | 缓推、跟拍、滑轨 | medium | 滑轨、Dolly |
| medium | 3-4 | 固定+微推、缓摇 | slow | 三脚架、电动轨道 |
| slow | 7-8 | 极缓推、极缓环绕 | very slow | 重型电影轨道、MOCO |
| slow | 5-6 | 极缓推、缓拉、固定 | slow | 电动数控轨道 |
| slow | 3-4 | 固定、极缓滑轨 | very slow | 三脚架、电动滑轨 |

### 基于叙事目的

| 叙事目的 | 推荐运镜 | 原因 |
|---------|---------|------|
| 引导注意力 | 推进(Push In) | 聚焦主体 |
| 揭示信息 | 拉开(Pull Back) | 展示更多 |
| 展示空间 | 摇镜(Pan)、倾斜(Tilt) | 扫视空间 |
| 跟随动作 | 跟拍(Tracking) | 动态叙事 |
| 强调时刻 | 环绕(Orbit) | 戏剧化 |
| 改变视角 | 升降(Crane) | 视角切换 |
| 客观呈现 | 固定(Static) | 稳定观察 |
| 主观视角 | 手持(Handheld) | 代入感 |
| 增加动感 | 滑轨(Slider) | 微妙动感 |

### 基于场景类型

| 场景类型 | 主要运镜 | 辅助运镜 | 禁忌运镜 |
|---------|---------|---------|---------|
| 对话场景 | 固定、缓推 | 滑轨、缓摇 | 快速摇、手持 |
| 动作场景 | 手持、快速跟拍 | 快速推拉、摇镜 | 固定、极缓推 |
| 内心戏 | 缓推、固定 | 极缓环绕 | 手持、快速摇 |
| 环境戏 | 摇镜、倾斜、升降 | 拉开、航拍 | 快速推 |
| 多人戏 | 固定、缓摇 | 滑轨、跟拍 | 环绕、快速推 |
| 打斗戏 | 手持、快速跟拍 | 飞猫、快速摇 | 固定、极缓推 |
| 追逐戏 | 手持跟拍、快速推 | 飞猫、航拍 | 固定、缓推 |

---

## 运镜组合原则

### 1. 情绪递进组合

**情绪上升**：
```
镜头1：固定 → 情绪平静
镜头2：缓推 → 情绪开始变化
镜头3：中速推 → 情绪上升
镜头4：快速推 → 情绪高涨
镜头5：环绕/特写 → 情绪爆发
```

### 2. 对话场景组合

**两人对话**：
```
镜头1：固定（中景，A+B） → 建立关系
镜头2：固定+微推（近景，A） → 说话
镜头3：固定（近景，B） → 反应
镜头4：滑轨（近景，B） → 说话+微妙动感
镜头5：固定（近景，A） → 反应
```

### 3. 动作场景组合

**追逐场面**：
```
镜头1：手持跟拍 → 跟随逃跑者
镜头2：快速推进 → 追赶者视角
镜头3：快速摇镜 → 切换视角
镜头4：手持跟拍 → 继续追逐
镜头5：固定 → 结果定格
```

### 4. 环境展示组合

**进入场景**：
```
镜头1：航拍/升降（下降） → 鸟瞰全景
镜头2：摇镜 → 扫视环境
镜头3：推进 → 聚焦人物
镜头4：固定 → 稳定呈现
```

---

## 竖屏运镜特殊规则

### 9:16构图调整

1. **推拉镜**：
   - 竖屏推拉镜聚焦人物更快
   - 从中景推至近景只需2-3秒
   - 避免极缓推（竖屏空间小，极缓推无意义）

2. **摇镜**：
   - 横向摇镜受限（画面宽度小）
   - 推荐快摇（Whip Pan）切换人物
   - 避免大幅度横摇（空间不足）

3. **倾斜**：
   - 竖屏天然适合倾斜（纵向空间大）
   - 从脚到头展示人物效果好
   - 可以用倾斜展示建筑/高度

4. **跟拍**：
   - 侧跟效果好（人物在画面中央）
   - 前跟/后跟需注意画面稳定性
   - 竖屏跟拍更适合单人

5. **环绕**：
   - 半环绕效果好（180度）
   - 全环绕可能导致构图失衡
   - 环绕速度要适中

6. **升降**：
   - 竖屏升降视角变化明显
   - 适合展示纵向空间
   - 配合推进效果更好

7. **固定**：
   - 竖屏最常用运镜
   - 配合景别切换实现节奏
   - 对话场景主力运镜

8. **手持**：
   - 竖屏手持真实感强
   - 晃动在竖屏更明显，慎用
   - 适合动作场面

9. **滑轨**：
   - 横向滑轨受限（空间小）
   - 前后滑轨效果好
   - 配合对话增加动感

---

## 运动辅助器材选择

### 器材分类与适用运镜

| 器材类型 | 适用运镜 | 特点 |
|---------|---------|------|
| **三脚架** | 固定、缓摇、倾斜 | 绝对稳定 |
| **手持** | 手持、快速跟拍 | 真实感、灵活 |
| **斯坦尼康** | 跟拍、环绕、手持 | 平滑+灵活 |
| **专业手持云台稳定器** | 跟拍、快速移动 | 平滑手持 |
| **Dolly** | 推拉、跟拍 | 平滑推拉 |
| **直线滑轨** | 推拉、滑轨 | 短距离平滑 |
| **弧形轨道** | 环绕、弧线移动 | 弧线运动 |
| **环形轨道** | 环绕、360度旋转 | 完整环绕 |
| **十字轨道** | 多方向移动 | 灵活调度 |
| **地轨** | 低位跟拍 | 低角度运动 |
| **天轨** | 高空移动 | 高位跟拍 |
| **悬空轨道** | 三维移动 | 自由运动 |
| **电动数控轨道** | 精确推拉、环绕 | 可编程、重复 |
| **伸缩炮轨道** | 快速推拉 | 快速推进 |
| **大型电影摇臂** | 升降、大幅度运动 | 宏大场面 |
| **电控小摇臂** | 升降、微调 | 精细控制 |
| **升降摇臂** | 垂直升降 | 高度变化 |
| **车载摇臂** | 移动+升降 | 复合运动 |
| **MOCO机械臂** | 精确复合运动 | 可编程、重复 |
| **飞猫索道系统** | 高速移动、三维空间 | 极速运动 |
| **钢丝索道摄影** | 高空移动 | 大范围移动 |
| **轨道飞猫** | 轨道+飞猫 | 复合系统 |
| **电控旋转云台** | 摇镜、环绕 | 精确旋转 |
| **俯仰云台** | 倾斜 | 精确俯仰 |
| **跟拍轨道车** | 跟拍 | 长距离跟随 |
| **低位滑轮车** | 低位跟拍 | 低角度运动 |
| **液压升降架** | 升降 | 大幅度升降 |
| **航拍无人机** | 航拍 | 空中视角 |
| **穿梭机** | 快速穿越 | 极速穿梭 |

### 器材选择决策树

```
1. 需要完全稳定？
   → YES：三脚架
   → NO：继续

2. 需要快速移动？
   → YES：手持、斯坦尼康、飞猫
   → NO：继续

3. 需要精确运动？
   → YES：电动数控轨道、MOCO机械臂
   → NO：继续

4. 需要升降？
   → YES：摇臂、液压升降架、航拍
   → NO：继续

5. 需要跟随？
   → YES：斯坦尼康、跟拍轨道车
   → NO：继续

6. 需要环绕？
   → YES：弧形轨道、环形轨道、电控旋转云台
   → NO：继续

7. 需要推拉？
   → YES：Dolly、直线滑轨、电动数控轨道
   → NO：固定（三脚架）
```

---

## 运镜与景别配合

| 运镜方式 | 起始景别 | 结束景别 | 效果 |
|---------|---------|---------|------|
| 推进 | 中景(MS) | 近景(CU) | 情绪强化 |
| 推进 | 近景(CU) | 特写(ECU) | 情绪爆发 |
| 拉开 | 近景(CU) | 中景(MS) | 情绪释放 |
| 拉开 | 中景(MS) | 全景(LS) | 揭示环境 |
| 环绕 | 近景(CU) | 近景(CU) | 戏剧化呈现 |
| 升降 | 全景(LS) | 远景(ELS) | 展示全貌 |
| 跟拍 | 中景(MS) | 中景(MS) | 保持距离 |
| 固定 | 任意 | 任意 | 稳定呈现 |

---

## 运镜平滑度

### Smooth（流畅）
**特点**：运动平滑，无抖动，专业感强  
**适用**：情绪稳定、诗意场景、对话场景  
**器材**：电动轨道、Dolly、斯坦尼康

### Jerky（顿挫）
**特点**：运动有抖动，真实感强  
**适用**：紧张场景、动作场面、主观视角  
**器材**：手持、快速移动

---

## 运镜设计检查清单

设计运镜时，检查以下问题：

- [ ] 运镜是否匹配节奏？
- [ ] 运镜是否匹配情绪强度？
- [ ] 运镜是否服务叙事目的？
- [ ] 器材选择是否合理？
- [ ] 运镜速度是否合适？
- [ ] 平滑度是否符合场景氛围？
- [ ] 对话场景是否避免过度运动？
- [ ] 动作场景是否使用手持/快速跟拍？
- [ ] 运镜是否与景别协同？
- [ ] 竖屏运镜是否适配？

---

## 常见错误

### ❌ 错误1：运镜过度
整场戏全是推拉摇移，没有固定镜头

**正确做法**：固定镜头占40-50%，给观众喘息空间

### ❌ 错误2：对话用手持
对话场景使用强烈手持晃动

**正确做法**：对话用固定或微推，保持稳定

### ❌ 错误3：速度不匹配
慢节奏场景用快速推进

**正确做法**：慢节奏用缓推或固定

### ❌ 错误4：器材不匹配
要求极缓推却选择手持

**正确做法**：极缓推用重型电影轨道或电动数控轨道

### ❌ 错误5：竖屏大幅横摇
竖屏使用大幅度横向摇镜

**正确做法**：竖屏避免大幅横摇，用快摇或推拉代替

---

## 使用建议

拍摄设计skill在设计运镜时：

1. **优先考虑节奏**：节奏决定运镜速度
2. **情绪强度匹配**：高强度用快速运镜
3. **对话场景克制**：固定为主，微推为辅
4. **动作场景灵活**：手持、快速跟拍
5. **器材合理选择**：根据运镜类型和速度选择
6. **固定占比40-50%**：不要过度运动
7. **竖屏运镜适配**：注意横向空间限制
8. **平滑度匹配氛围**：情绪稳定用smooth，紧张用jerky

---

**版本**：v1.0  
**最后更新**：2026-06-03

## Reference: cinematography-styles

# 摄影风格库（Cinematography Styles）

本文档包含大师级摄影风格的定义和典型特征，供拍摄设计skill参考。

---

## 1. 写实主义（Realism）

### 风格特征
- 自然光照为主，尽量还原真实环境
- 镜头运动克制，避免过度炫技
- 色彩真实，不过度调色
- 景别选择服务叙事，不刻意追求视觉冲击

### 典型手法
- **光照**：使用自然光或模拟自然光，避免人工痕迹
- **运镜**：固定镜头、缓慢推拉、自然跟随
- **景别**：以中景、近景为主，建立真实距离感
- **色调**：自然色温，保留环境本色

### 适用场景
- 日常生活场景
- 人物对话场景
- 情感细腻的文戏
- 纪实风格短剧

### 代表作品
- 肯·洛奇（Ken Loach）作品
- 达内兄弟（Dardenne Brothers）作品
- 《罗马》（Roma）

### 9:16竖屏适配
- 竖构图强调人物纵向关系
- 利用前景/背景营造真实空间感
- 避免过度裁切，保持环境信息

---

## 2. 表现主义（Expressionism）

### 风格特征
- 夸张的光影对比，强烈的明暗反差
- 极端的镜头角度（大俯视、大仰视）
- 非自然的色彩处理
- 主观化的视觉呈现

### 典型手法
- **光照**：强烈侧光、逆光、顶光，制造戏剧性阴影
- **运镜**：倾斜构图、快速推拉、旋转镜头
- **景别**：特写和远景的极端对比
- **色调**：高对比度，单色调或强烈色彩

### 适用场景
- 心理戏
- 悬疑惊悚
- 情绪极端的场景
- 梦境、幻觉

### 代表作品
- 弗里茨·朗（Fritz Lang）《大都会》
- 蒂姆·伯顿（Tim Burton）作品
- 朴赞郁（Park Chan-wook）《小姐》

### 9:16竖屏适配
- 利用竖向构图强化压迫感
- 顶光/底光制造戏剧性阴影
- 极端景别切换增强冲击力

---

## 3. 纪实风格（Documentary Style）

### 风格特征
- 手持摄影，保留自然晃动
- 现场光为主，不打人工光
- 镜头跟随动作，有纪录片感
- 抓拍式构图，不刻意设计

### 典型手法
- **光照**：完全使用现场光
- **运镜**：手持跟拍、快速摇镜、不规则移动
- **景别**：灵活切换，以中景、近景为主
- **色调**：自然色彩，略带颗粒感

### 适用场景
- 动作场面
- 紧张追逐
- 混乱场景
- 真实感强的戏

### 代表作品
- 保罗·格林格拉斯（Paul Greengrass）《谍影重重》系列
- 阿方索·卡隆（Alfonso Cuarón）《人类之子》

### 9:16竖屏适配
- 手持晃动在竖屏更显真实
- 快速摇镜捕捉人物反应
- 保留粗糙质感增强纪实感

---

## 4. 诗意风格（Poetic / Lyrical）

### 风格特征
- 唯美的构图和光影
- 流畅的运镜，如诗如画
- 柔和的色彩处理
- 意境化的视觉表达

### 典型手法
- **光照**：柔光为主，黄金时段自然光
- **运镜**：缓慢推拉、流畅跟随、升降镜头
- **景别**：全景、中景展示环境美感
- **色调**：柔和色调，低饱和度或暖调

### 适用场景
- 浪漫场景
- 回忆闪回
- 情感细腻的文戏
- 古装唯美戏

### 代表作品
- 王家卫作品
- 泰伦斯·马力克（Terrence Malick）《生命之树》
- 张艺谋《英雄》

### 9:16竖屏适配
- 竖构图强化人物诗意感
- 利用前景虚化营造层次
- 缓慢运镜保持流畅性

---

## 5. 商业片风格（Commercial / Blockbuster）

### 风格特征
- 视觉冲击力强，镜头语言丰富
- 快节奏剪辑，镜头切换频繁
- 精致的布光和色彩
- 多样化的运镜手法

### 典型手法
- **光照**：精心设计的多点光源，突出主体
- **运镜**：推拉摇移升降环绕，各种手法结合
- **景别**：频繁切换，特写与全景结合
- **色调**：高饱和度，电影级调色

### 适用场景
- 动作场面
- 大场面戏
- 商业短剧
- 快节奏剧情

### 代表作品
- 迈克尔·贝（Michael Bay）作品
- 漫威电影
- 韩国商业片

### 9:16竖屏适配
- 快速切换景别保持节奏
- 利用竖向空间设计动作
- 精致布光突出人物主体

---

## 6. 黑色电影（Film Noir）

### 风格特征
- 高对比度黑白或低饱和度色彩
- 强烈的侧光和逆光
- 阴影和剪影运用
- 倾斜构图（Dutch Angle）

### 典型手法
- **光照**：强烈侧光、百叶窗光影、烟雾光束
- **运镜**：固定镜头为主，偶尔缓慢推拉
- **景别**：近景、特写捕捉人物表情
- **色调**：黑白或去饱和，强调明暗对比

### 适用场景
- 犯罪悬疑
- 黑帮题材
- 心理惊悚
- 夜戏

### 代表作品
- 比利·怀尔德（Billy Wilder）《双重赔偿》
- 科恩兄弟《血迷宫》
- 《罪恶之城》

### 9:16竖屏适配
- 竖向阴影增强压迫感
- 侧光制造脸部明暗分割
- 倾斜构图在竖屏更具冲击力

---

## 7. 新浪潮（New Wave）

### 风格特征
- 打破常规的剪辑和镜头语言
- 跳切（Jump Cut）频繁使用
- 自然光拍摄，即兴感强
- 镜头直面观众（Breaking the 4th Wall）

### 典型手法
- **光照**：自然光为主，不刻意修饰
- **运镜**：手持、快速摇镜、跳跃式切换
- **景别**：不拘一格，打破传统
- **色调**：自然色彩，保留原始质感

### 适用场景
- 实验性短剧
- 青春题材
- 前卫作品
- 打破第四堵墙的戏

### 代表作品
- 让-吕克·戈达尔（Jean-Luc Godard）《精疲力尽》
- 弗朗索瓦·特吕弗（François Truffaut）《四百击》

### 9:16竖屏适配
- 跳切在竖屏节奏更快
- 手持晃动增强即兴感
- 直面镜头在竖屏更亲密

---

## 8. 超现实主义（Surrealism）

### 风格特征
- 违反物理规律的镜头运动
- 梦幻般的色彩和光影
- 非常规的构图和视角
- 象征性的视觉元素

### 典型手法
- **光照**：非自然光源，多彩灯光
- **运镜**：旋转、倾斜、不规则运动
- **景别**：极端景别，扭曲视角
- **色调**：强烈色彩、多色调混合

### 适用场景
- 梦境、幻觉
- 魔幻现实
- 心理异常
- 超自然题材

### 代表作品
- 大卫·林奇（David Lynch）作品
- 阿利安卓·冈萨雷斯·伊纳里图（Alejandro González Iñárritu）《鸟人》
- 达伦·阿伦诺夫斯基（Darren Aronofsky）《黑天鹅》

### 9:16竖屏适配
- 竖向扭曲增强超现实感
- 多色光影在竖屏更集中
- 极端景别切换增强梦幻感

---

## 9. 斯堪的纳维亚极简（Scandinavian Minimalism）

### 风格特征
- 极简构图，留白充足
- 柔和自然光照
- 冷色调为主
- 静态镜头居多

### 典型手法
- **光照**：自然窗光，柔和漫射
- **运镜**：固定镜头、极缓推拉
- **景别**：中景、全景，保持距离感
- **色调**：冷色调，低饱和度

### 适用场景
- 极简主义短剧
- 内心戏
- 冷静叙事
- 北欧题材

### 代表作品
- 罗伊·安德森（Roy Andersson）作品
- 《海边的曼彻斯特》

### 9:16竖屏适配
- 竖向留白增强孤独感
- 冷色调在竖屏更显疏离
- 静态镜头保持克制美感

---

## 10. 武侠风格（Wuxia / Martial Arts）

### 风格特征
- 夸张的运镜配合武打动作
- 慢动作与快动作结合
- 飘逸的运镜（飞猫、航拍）
- 强烈的色彩对比

### 典型手法
- **光照**：戏剧化布光，突出动作
- **运镜**：快速跟随、环绕、升降、飞猫
- **景别**：全景展示动作，特写捕捉细节
- **色调**：高饱和度，强烈色彩

### 适用场景
- 武打场面
- 古装动作
- 飞檐走壁
- 剑战戏

### 代表作品
- 徐克作品
- 张艺谋《英雄》
- 李安《卧虎藏龙》

### 9:16竖屏适配
- 竖向空间展示纵向动作
- 快速跟拍在竖屏更紧凑
- 慢动作增强视觉冲击

---

## 风格选择指南

| 剧情类型 | 推荐风格 | 备选风格 |
|---------|---------|---------|
| 古装女频 | 诗意风格 | 商业片风格 |
| 现代都市 | 写实主义 | 商业片风格 |
| 悬疑权谋 | 黑色电影 | 表现主义 |
| 动作打戏 | 武侠风格 | 商业片风格 |
| 爱情文戏 | 诗意风格 | 写实主义 |
| 心理惊悚 | 表现主义 | 黑色电影 |
| 青春校园 | 写实主义 | 新浪潮 |
| 奇幻魔幻 | 超现实主义 | 表现主义 |
| 历史正剧 | 写实主义 | 商业片风格 |
| 喜剧轻松 | 商业片风格 | 新浪潮 |

---

## 风格混合原则

1. **主风格+辅助风格**：一场戏可以有主导风格，在关键时刻切换辅助风格
2. **情绪驱动切换**：根据情绪强度变化切换风格
3. **保持一致性**：同一集内风格不宜变化过大
4. **服务叙事**：风格选择必须服务于剧情和情绪表达

---

## 9:16竖屏通用原则

无论选择何种风格，竖屏构图都需要注意：

1. **纵向构图**：利用竖向空间，强调人物高度关系
2. **前景虚化**：用前景元素增加景深层次
3. **脸部优先**：竖屏天然适合人物脸部特写
4. **上下分层**：上下空间可以分层叙事
5. **快速切换**：竖屏适合快节奏剪辑
6. **带关系镜头**：竖向排列角色，呈现关系
7. **避免横向平移**：横向空间有限，避免大幅平移
8. **利用纵深**：用纵深拉开前后景距离

---

## 使用建议

拍摄设计skill在选择风格时：

1. **优先考虑剧情类型**：根据表格快速匹配
2. **分析情绪强度**：高强度情绪倾向表现主义/黑色电影
3. **考虑叙事需求**：叙事为主选写实，情绪为主选诗意
4. **尊重用户偏好**：如果用户指定风格，优先使用
5. **保持全剧一致**：同一部短剧内，风格不宜跨度过大
6. **关键场次可突破**：剧情转折点可以切换风格增强冲击

---

**版本**：v1.0  
**最后更新**：2026-06-03

## Reference: fight-cinematography-patterns

# 动作与打斗摄影参考


## 打斗镜头基本原则

- 少量角色优先，1v1或1v2更容易清晰。
- 每个动作要有攻击线、防守/闪避、接触点、重心变化、结果。
- 摄影机服务动作可读性，不为炫技破坏空间。
- 避免血腥和真实伤害描写，按电影特技安全处理。

## 动作节拍字段

```typescript
fightBeat: {
  attacker: string;
  attackLine: string;       // 从哪里打向哪里
  defenseOrEvasion: string; // 如何挡/躲
  contactPoint: string;     // 接触点
  footwork: string;         // 脚步和重心
  result: string;           // 对方如何反应
  cameraResponse: string;   // 摄影机如何跟
  soundOrEnvironment: string;
}
```

## 长镜头近身打斗

适用于港片犯罪感、巷战、仓库、走廊、车边近身搏斗：

- 一条连续动作链，不突然换空间。
- 保持全身可读，关键摔、踢、抱摔前拉开景别。
- 每次撞击都绑定环境：墙面、桌角、车门、地面、柱子。
- 声音反馈具体：衣料摩擦、鞋底急停、金属碰撞、木椅滑动、呼吸。

## 环境打斗

环境不是背景，而是动作因果的一部分：

```text
身体 -> 道具接触 -> 道具反应 -> 对手反应 -> 摄影机反应 -> 声音反馈
```

可用环境锚点：

- 赌桌、长凳、木柱、门框、车身、扶手、墙面、楼梯、地面水渍、碎玻璃、灯管。

## 节奏模式

10-15秒打斗建议：

- 2-3个镜头。
- 6-10个动作节拍。
- 不要超过一个主要攻防阶段和一个反制阶段。

可用节奏：

```text
试探 -> 近身 -> 失衡 -> 环境撞击 -> 短暂停顿 -> 反制
```

## 摄影方式

- `FLS/LS`：保证全身动作可读。
- `Handheld`：可用于压迫和混乱，但不能晃到看不清。
- `Dolly/Track`：跟随身体移动。
- 短慢动作：只用于关键接触瞬间，随后回到实时。
- Dutch angle：少用，只在失衡或心理压迫时使用。

## 失败修正

- 动作太多：删到6-10个节拍。
- 看不清谁打谁：固定A/B屏幕位置。
- 摔倒无因果：补重心变化、抓握和借力。
- 环境随机变化：建立房间布局和道具位置。
- 人群干扰：人群只做压力和反应，不进入主打斗。

## Reference: shot-camera-vocabulary

# 景别、镜头与运镜词汇库


## 景别标准词

人物景别：

- `ECU` Extreme Close-Up：极细节，如眼睛、嘴唇、手指。
- `VCU` Very Close-Up：脸部，额头到下巴。
- `BCU` Big Close-Up：完整头部。
- `CU` Close-Up：头肩。
- `MCU` Medium Close-Up：头到胸下。
- `WS` Waist Shot：头到腰。
- `KS` Knee Shot：头到膝。
- `FLS` Full Length Shot：全身，头脚留空间。
- `LS` Long Shot：人物占画面约3/4到1/3。
- `ELS` Extra Long Shot：人物很小，强调环境。

物体/场景景别：

- `CU`：局部细节。
- `MCU`：主体约1/4。
- `MS`：主体约1/2。
- `MLS`：主体完整加部分环境。
- `LS`：主体与环境关系。
- `ELS`：大环境。

## 运镜标准词

- `Dolly In/Out`：摄影机向前/向后移动。
- `Track In/Out`：同Dolly，强调轨道或跟随。
- `Pan Right/Left`：水平摇镜。
- `Tilt Up/Down`：垂直摇镜。
- `Track Right/Left` / `Crab Right/Left`：横移。
- `Ped Up/Down`：摄影机整体升降。
- `Zoom In/Out`：焦距变化，摄影机不移动。
- `Static`：固定机位。
- `Handheld`：手持。
- `Slow Push in`：慢推，可用于情绪逼近。

## 焦段词汇

- `24mm`：空间感、压迫接近、运动。
- `35mm`：环境与人物平衡。
- `50mm`：自然视角、对话和中景。
- `85mm`：人像特写、情绪压缩。
- `100mm macro`：道具、皮肤、细节。
- `200mm`：远距离压缩、观察感。

## 使用规则

- 不堆术语。每个镜头只写真正影响画面的景别、焦段、运镜。
- 大动作前拉开景别，避免CU里塞转身、跌倒、拥抱、格斗。
- 情绪特写可以少切镜，用固定机位或极慢推近。
- 运镜要由视线、身体移动、情绪距离或物件动作触发。

## 常见错误

- 同时要求多个不可能运镜：推进、横移、环绕、快速变焦全部同一镜。
- 相邻镜头景别太接近，剪辑像跳切。
- 说“镜头跟随情绪”，但不写摄影机怎么动。
- 用Zoom表达摄影机前进，导致画面质感与预期不一致。

## Reference: shot-size-rules

# 景别选择规则（Shot Size Rules）

本文档定义景别的具体含义、选择规则和使用场景，供拍摄设计skill参考。

---

## 景别定义

### 1. 远景（Extreme Long Shot, ELS）
**画面范围**：广阔环境，人物很小或不可见  
**英文缩写**：ELS  
**中文名称**：远景 / 大远景  
**9:16适配**：竖屏远景强调纵深，人物位于画面下方

**作用**：
- 建立地理位置和空间关系
- 展示宏大场面
- 营造氛围和时代感
- 表现人物与环境的关系

**适用场景**：
- 开场建立镜头
- 场景转换
- 展示环境变化
- 表现人物孤独感

**情绪强度**：1-3（低强度）  
**叙事功能**：环境叙事、氛围营造

---

### 2. 全景（Long Shot, LS）
**画面范围**：人物全身+部分环境  
**英文缩写**：LS  
**中文名称**：全景  
**9:16适配**：竖屏全景人物占据大部分画面高度

**作用**：
- 展示人物完整动作
- 呈现人物与环境互动
- 建立人物空间位置
- 展示多人关系

**适用场景**：
- 动作场面
- 走位调度
- 多人互动
- 环境与人物结合

**情绪强度**：2-4（低到中）  
**叙事功能**：动作叙事、空间关系

---

### 3. 中全景（Full Shot, FS）
**画面范围**：人物全身，环境较少  
**英文缩写**：FS  
**中文名称**：中全景  
**9:16适配**：竖屏中全景人物顶天立地

**作用**：
- 突出人物动作
- 保留身体语言信息
- 适度呈现环境
- 展示人物姿态

**适用场景**：
- 人物登场
- 身体动作重要的戏
- 服装展示
- 仪态展现

**情绪强度**：3-5（中）  
**叙事功能**：人物展示、动作叙事

---

### 4. 中景（Medium Shot, MS）
**画面范围**：腰部以上  
**英文缩写**：MS  
**中文名称**：中景  
**9:16适配**：竖屏中景是最常用景别，适合对话

**作用**：
- 对话场景主力景别
- 平衡环境与人物
- 展示上半身动作和表情
- 建立角色关系

**适用场景**：
- 对话场景
- 日常互动
- 情绪中等的戏
- 带关系镜头

**情绪强度**：4-6（中）  
**叙事功能**：对话叙事、关系呈现

---

### 5. 近景（Close-Up, CU）
**画面范围**：肩部以上，主要是脸部  
**英文缩写**：CU  
**中文名称**：近景 / 特写  
**9:16适配**：竖屏近景脸部占据主要画面，效果强烈

**作用**：
- 捕捉细腻表情
- 传递情绪
- 引导观众注意力
- 建立情感连接

**适用场景**：
- 情绪高潮
- 关键台词
- 内心戏
- 反应镜头

**情绪强度**：6-8（高）  
**叙事功能**：情绪叙事、内心呈现

---

### 6. 特写（Extreme Close-Up, ECU）
**画面范围**：脸部局部（眼睛/嘴唇等）或物体细节  
**英文缩写**：ECU  
**中文名称**：特写 / 大特写  
**9:16适配**：竖屏特写冲击力极强，慎用

**作用**：
- 极致情绪表达
- 细节强化
- 戏剧性时刻
- 视觉冲击

**适用场景**：
- 情绪爆发
- 关键物品
- 转折时刻
- 心理高潮

**情绪强度**：8-10（极高）  
**叙事功能**：情绪爆发、细节揭示

---

## 景别选择规则矩阵

### 基于情绪强度

| 情绪强度 | 推荐景别 | 备选景别 | 避免景别 |
|---------|---------|---------|---------|
| 1-2（极低） | 远景(ELS) | 全景(LS) | 特写(ECU) |
| 3-4（低） | 全景(LS) | 中全景(FS) | 特写(ECU) |
| 5-6（中） | 中景(MS) | 中全景(FS), 近景(CU) | 远景(ELS) |
| 7-8（高） | 近景(CU) | 中景(MS), 特写(ECU) | 远景(ELS) |
| 9-10（极高） | 特写(ECU) | 近景(CU) | 全景(LS) |

### 基于叙事目的

| 叙事目的 | 推荐景别 | 原因 |
|---------|---------|------|
| 建立场景 | 远景(ELS), 全景(LS) | 展示环境信息 |
| 展示动作 | 全景(LS), 中全景(FS) | 保留身体动作 |
| 对话场景 | 中景(MS), 近景(CU) | 平衡环境与表情 |
| 情感表达 | 近景(CU), 特写(ECU) | 捕捉细腻情绪 |
| 关系呈现 | 中景(MS), 中全景(FS) | 展示角色位置关系 |
| 氛围营造 | 远景(ELS), 全景(LS) | 环境渲染 |
| 细节揭示 | 特写(ECU) | 聚焦关键信息 |

### 基于场景类型

| 场景类型 | 主要景别 | 辅助景别 | 高潮景别 |
|---------|---------|---------|---------|
| 对话场景 | 中景(MS) | 近景(CU) | 特写(ECU) |
| 动作场景 | 全景(LS), 中全景(FS) | 中景(MS) | 近景(CU) |
| 内心戏 | 近景(CU) | 中景(MS) | 特写(ECU) |
| 环境戏 | 远景(ELS), 全景(LS) | 中全景(FS) | 中景(MS) |
| 多人戏 | 中景(MS) | 全景(LS) | 近景(CU) |
| 打斗戏 | 全景(LS) | 中全景(FS), 中景(MS) | 近景(CU) |

---

## 景别组合原则

### 1. 对话场景标准组合

**两人对话**（AB对话）：
```
镜头1：中景(MS) - A + B（带关系，建立空间）
镜头2：近景(CU) - A说话（捕捉表情）
镜头3：近景(CU) - B反应（情绪传递）
镜头4：近景(CU) - B说话
镜头5：近景(CU) - A反应
镜头6：中景(MS) - A + B（重建关系）
```

**重要台词**：
```
镜头1：近景(CU) - 说话者
镜头2：特写(ECU) - 说话者关键词（强化）
镜头3：近景(CU) - 听者反应（情绪传递）
```

### 2. 动作场景标准组合

**角色动作**：
```
镜头1：全景(LS) - 建立动作空间
镜头2：中全景(FS) - 展示完整动作
镜头3：中景(MS) - 捕捉上半身细节
镜头4：近景(CU) - 表情反应（如果需要）
```

### 3. 情绪递进组合

**情绪爆发**：
```
镜头1：中景(MS) - 情绪起始（中强度）
镜头2：近景(CU) - 情绪上升（高强度）
镜头3：特写(ECU) - 情绪爆发（极高强度）
镜头4：近景(CU) - 情绪余波
```

### 4. 场景转换组合

**进入场景**：
```
镜头1：远景(ELS) - 建立环境
镜头2：全景(LS) - 人物入场
镜头3：中景(MS) - 人物状态
镜头4：近景(CU) - 表情细节（如果需要）
```

---

## 竖屏景别特殊规则

### 9:16构图调整

1. **远景(ELS)**：
   - 竖向空间拉长，人物位于画面下方1/3
   - 上方2/3展示天空/建筑/纵深
   - 强调纵向压迫感或开阔感

2. **全景(LS)**：
   - 人物占据画面高度70-80%
   - 上下留白适中
   - 适合展示站立姿态

3. **中全景(FS)**：
   - 人物几乎顶天立地
   - 头顶、脚底略留白
   - 强调人物存在感

4. **中景(MS)**：
   - 竖屏最常用景别
   - 腰部以上，头顶留白1/5
   - 最适合对话场景

5. **近景(CU)**：
   - 脸部占据主要画面
   - 肩部以上，头顶留白少
   - 情绪表达效果极佳

6. **特写(ECU)**：
   - 脸部局部充满画面
   - 冲击力极强，慎用
   - 只用于关键情绪时刻

### 竖屏景别频率建议

| 景别 | 使用频率 | 备注 |
|-----|---------|------|
| 远景(ELS) | 5-10% | 开场/转场用 |
| 全景(LS) | 10-15% | 动作场景用 |
| 中全景(FS) | 10-15% | 人物登场用 |
| 中景(MS) | 40-50% | 对话主力景别 |
| 近景(CU) | 20-30% | 情绪表达 |
| 特写(ECU) | 5-10% | 高潮时刻 |

---

## 景别切换原则

### 1. 渐进原则
- 景别切换不宜跨度过大
- 远景→全景→中景→近景（循序渐进）
- 避免：远景→特写（跨度太大）

### 2. 对比原则
- 关键时刻可以用对比切换制造冲击
- 全景→特写（强烈对比）
- 适用于情绪爆发、转折时刻

### 3. 节奏原则
- 快节奏：景别快速切换，每个镜头2-4秒
- 中节奏：景别稳定切换，每个镜头4-8秒
- 慢节奏：景别缓慢切换，每个镜头8-15秒

### 4. 情绪原则
- 情绪上升：景别逐渐拉近（MS→CU→ECU）
- 情绪下降：景别逐渐拉远（ECU→CU→MS）
- 情绪稳定：景别保持不变或小幅调整

---

## 特殊情况处理

### 多人场景

**3人对话**：
```
镜头1：中景(MS) - 三人（建立关系）
镜头2：中景(MS) - A+B（两人小组）
镜头3：近景(CU) - C（单独反应）
镜头4：近景(CU) - 说话者
镜头5：中景(MS) - 听者们
```

**群戏**：
```
镜头1：全景(LS) - 全体（建立空间）
镜头2：中景(MS) - 主说话者+周围几人
镜头3：近景(CU) - 主说话者
镜头4：中景(MS) - 听众反应
镜头5：近景(CU) - 关键听众特写
```

### VO（画外音）场景

**人物不在画面中**：
```
镜头1：远景(ELS) 或 全景(LS) - 展示环境
镜头2：中景(MS) - 环境细节
镜头3：特写(ECU) - 物品细节（如果需要）
配合VO台词，景别服务氛围营造
```

### 打斗场景

**武打动作**：
```
镜头1：全景(LS) - 建立打斗空间
镜头2：中全景(FS) - 完整动作展示
镜头3：中景(MS) - 上半身攻防
镜头4：近景(CU) - 表情反应/痛苦
镜头5：特写(ECU) - 击中瞬间（慢动作）
```

---

## 景别与摄影机参数关系

### 景深配置

| 景别 | 推荐景深 | 光圈范围 | 原因 |
|-----|---------|---------|------|
| 远景(ELS) | 深景深 | f/8-f/16 | 保证前后景清晰 |
| 全景(LS) | 深景深 | f/5.6-f/11 | 展示环境信息 |
| 中全景(FS) | 中景深 | f/4-f/8 | 平衡主体与环境 |
| 中景(MS) | 中浅景深 | f/2.8-f/5.6 | 突出人物，虚化背景 |
| 近景(CU) | 浅景深 | f/1.4-f/2.8 | 强烈虚化，聚焦脸部 |
| 特写(ECU) | 浅景深 | f/1.4-f/2 | 极致虚化，聚焦局部 |

### 焦距选择

| 景别 | 推荐焦距 | 效果 |
|-----|---------|------|
| 远景(ELS) | 18-24mm | 广角，展示空间 |
| 全景(LS) | 24-35mm | 标准广角 |
| 中全景(FS) | 35-50mm | 标准视角 |
| 中景(MS) | 50-85mm | 自然透视 |
| 近景(CU) | 85-135mm | 压缩空间，柔化背景 |
| 特写(ECU) | 100-200mm | 极度压缩，强烈虚化 |

---

## 景别选择检查清单

设计镜头时，检查以下问题：

- [ ] 景别是否匹配情绪强度？
- [ ] 景别是否服务叙事目的？
- [ ] 景别切换是否流畅？
- [ ] 对话场景是否每人都有近景？
- [ ] 关键台词后是否有反应镜头？
- [ ] 多人场景是否有带关系镜头？
- [ ] 景别分布是否符合竖屏频率建议？
- [ ] 特写使用是否过多？（应<10%）
- [ ] 远景使用是否足够？（建立场景）

---

## 常见错误

### ❌ 错误1：景别单一
整场戏只用中景(MS)，缺乏变化

**正确做法**：根据情绪和叙事需求灵活切换

### ❌ 错误2：特写滥用
大量使用特写(ECU)，导致审美疲劳

**正确做法**：特写控制在5-10%，只用于关键时刻

### ❌ 错误3：跨度过大
远景(ELS)直接切特写(ECU)

**正确做法**：渐进切换或在转折时刻用对比切换

### ❌ 错误4：对话无近景
两人对话全程用中景(MS)

**正确做法**：每人说话时至少一个近景(CU)

### ❌ 错误5：动作无全景
打斗场面全用近景(CU)，看不清动作

**正确做法**：用全景(LS)建立空间，中景(MS)展示动作

---

## 使用建议

拍摄设计skill在选择景别时：

1. **优先考虑情绪强度**：这是最重要的依据
2. **参考叙事目的**：景别必须服务叙事
3. **注意竖屏特性**：中景(MS)和近景(CU)是主力
4. **保持合理分布**：避免景别过于单一
5. **对话场景必备**：每人说话都要有近景
6. **关键时刻强化**：高潮用特写(ECU)
7. **流畅切换**：避免景别跨度过大
8. **配合运镜**：景别与运镜协同设计

---

**版本**：v1.0  
**最后更新**：2026-06-03

## Reference: transition-rules

# 转场方式规则（Transition Rules）

本文档定义转场方式的具体含义、选择规则和使用场景，供拍摄设计skill参考。

---

## 转场方式定义

### 1. 切（Cut / Hard Cut）

**方式**：直接切换，无过渡  
**英文名称**：Cut / Hard Cut  
**中文名称**：切 / 硬切

**特点**：
- 最常用的转场方式（占90%以上）
- 瞬间切换，无过渡时间
- 保持节奏，干净利落
- 遵循电影语法（匹配剪辑原则）

**心理效果**：
- 自然、流畅（遵循语法时）
- 紧张、快速（快节奏切换时）
- 日常、真实

**适用场景**：
- 所有常规场景
- 快节奏对话
- 动作场面
- 紧张时刻
- 日常叙事

**切换类型**：
- **匹配剪辑（Match Cut）**：画面元素匹配
- **跳切（Jump Cut）**：同一主体快速切换
- **交叉剪辑（Cross Cut）**：两条线索交替
- **插入镜头（Insert Cut）**：插入细节镜头

**9:16竖屏适配**：
- 竖屏最常用转场
- 快节奏切换保持紧凑
- 适合所有场景

---

### 2. 淡入淡出（Fade In / Fade Out）

**方式**：画面逐渐变黑/变亮  
**英文名称**：Fade In / Fade Out  
**中文名称**：淡入 / 淡出

**特点**：
- 温和的过渡
- 有明确的时间感
- 常用于段落结束/开始
- 给观众喘息空间

**心理效果**：
- 时间跨越
- 段落分隔
- 情绪沉淀
- 结束/开始感

**适用场景**：
- 段落转换
- 时间跨越（几小时到几天）
- 情绪沉淀时刻
- 开场/结尾
- 回忆/梦境结束

**淡出颜色**：
- **淡出至黑（Fade to Black）**：最常用，结束感强
- **淡出至白（Fade to White）**：梦幻、超脱感
- **淡出至色彩**：特殊氛围（淡出至红/蓝等）

**时长**：
- **短淡（1-2秒）**：轻微时间跨越
- **中淡（2-4秒）**：明显段落分隔
- **长淡（4-8秒）**：重大时间跨越或情绪沉淀

**9:16竖屏适配**：
- 竖屏淡入淡出效果好
- 适合段落转换
- 给观众缓冲时间

---

### 3. 叠化（Dissolve / Cross Dissolve）

**方式**：两个画面重叠过渡  
**英文名称**：Dissolve / Cross Dissolve  
**中文名称**：叠化 / 交叉溶解

**特点**：
- 前一画面渐隐，后一画面渐显
- 两画面短暂重叠
- 柔和、诗意的过渡
- 暗示关联或对比

**心理效果**：
- 流畅、诗意
- 时间流逝
- 情绪延续
- 梦境、回忆
- 关联暗示

**适用场景**：
- 时间流逝（几分钟到几小时）
- 情绪延续
- 回忆/闪回
- 梦境过渡
- 蒙太奇序列
- 地点转换（有关联时）

**叠化类型**：
- **标准叠化**：等速渐变
- **慢叠化（Slow Dissolve）**：3-5秒，强调诗意
- **快叠化（Quick Dissolve）**：1-2秒，轻微关联

**9:16竖屏适配**：
- 竖屏叠化柔和过渡
- 适合情绪延续场景
- 回忆/梦境效果好

---

### 4. 划像（Wipe）

**方式**：新画面推走旧画面  
**英文名称**：Wipe  
**中文名称**：划像 / 擦除

**特点**：
- 明显的转场标记
- 风格化、个性化
- 有方向感和节奏感
- 不够自然，适合特定风格

**心理效果**：
- 风格化、趣味性
- 快节奏、轻快
- 复古感（致敬老电影）
- 清晰的段落分隔

**适用场景**：
- 风格化短剧
- 快节奏转场
- 复古风格
- 蒙太奇序列
- 轻松喜剧
- 时间/地点快速切换

**划像类型**：
- **横向划像（Horizontal Wipe）**：左右推移
- **纵向划像（Vertical Wipe）**：上下推移
- **圆形划像（Iris Wipe）**：圆形扩大/缩小
- **时钟划像（Clock Wipe）**：旋转推移
- **菱形划像（Diamond Wipe）**：菱形扩展

**9:16竖屏适配**：
- 竖屏适合纵向划像
- 横向划像受限（空间小）
- 圆形划像效果好

---

### 5. 跳切（Jump Cut）

**方式**：同一主体快速切换，打破时空连续性  
**英文名称**：Jump Cut  
**中文名称**：跳切

**特点**：
- 打破传统剪辑语法
- 快速时间跳跃
- 不连贯但有意为之
- 新浪潮风格

**心理效果**：
- 时间压缩
- 节奏感强
- 前卫、实验性
- 碎片化叙事

**适用场景**：
- 时间压缩（重复动作）
- 蒙太奇序列
- 实验性短剧
- 快节奏片段
- 日常流水（穿衣、吃饭等）

**9:16竖屏适配**：
- 竖屏跳切节奏更快
- 适合短视频节奏
- 时间压缩效果好

---

### 6. 匹配剪辑（Match Cut）

**方式**：通过画面元素的相似性连接两个镜头  
**英文名称**：Match Cut  
**中文名称**：匹配剪辑

**特点**：
- 视觉元素匹配（形状/颜色/动作）
- 暗示关联或对比
- 巧妙、诗意的转场
- 需要精心设计

**心理效果**：
- 巧妙、优雅
- 关联暗示
- 时空跳跃
- 隐喻、象征

**适用场景**：
- 时空跳跃
- 关联暗示
- 对比呈现
- 艺术化转场
- 蒙太奇序列

**匹配类型**：
- **形状匹配**：相似形状（圆形→圆形）
- **动作匹配**：相似动作（抬手→抬手）
- **颜色匹配**：相似色调
- **主题匹配**：主题关联（眼睛→镜头）

**经典案例**：
- 《2001太空漫游》：骨头→飞船
- 《阿拉伯的劳伦斯》：火柴→日出

**9:16竖屏适配**：
- 竖屏匹配剪辑更集中
- 形状匹配效果好
- 适合艺术化呈现

---

### 7. L-Cut / J-Cut

**方式**：声画分离的转场  
**英文名称**：L-Cut / J-Cut  
**中文名称**：L剪辑 / J剪辑

**特点**：
- **L-Cut**：前一场景声音延续到后一场景画面
- **J-Cut**：后一场景声音提前出现在前一场景画面
- 声画错位
- 平滑过渡

**心理效果**：
- 自然、流畅
- 预示/回味
- 无缝衔接
- 引导注意力

**适用场景**：
- 对话场景转换
- 场景间平滑过渡
- 预示下一场景
- 回味前一场景

**9:16竖屏适配**：
- 竖屏适合声画分离
- 对话转场流畅
- 保持叙事连贯

---

### 8. 无缝转场（Seamless Transition）

**方式**：通过巧妙设计实现"看不见"的转场  
**英文名称**：Seamless Transition / Invisible Cut  
**中文名称**：无缝转场 / 隐形剪辑

**特点**：
- 转场隐藏在动作/遮挡中
- 营造长镜头错觉
- 需要精心设计
- 技术要求高

**心理效果**：
- 沉浸、流畅
- 长镜头感
- 技术炫技
- 一气呵成

**适用场景**：
- 长镜头风格
- 沉浸式叙事
- 技术展示
- 连贯动作场面

**实现方式**：
- **遮挡转场**：人物/物体遮挡镜头
- **旋转转场**：快速旋转过渡
- **移动转场**：快速移动过渡
- **黑场转场**：短暂黑场

**9:16竖屏适配**：
- 竖屏无缝转场需精心设计
- 遮挡转场效果好
- 适合短视频炫技

---

## 转场选择规则矩阵

### 基于时间跨度

| 时间跨度 | 推荐转场 | 原因 |
|---------|---------|------|
| 无跨度（连续） | 切(Cut) | 保持连贯 |
| 几秒钟 | 切(Cut) | 自然流畅 |
| 几分钟 | 叠化(Dissolve) | 轻微时间感 |
| 几小时 | 淡入淡出(Fade) 或 叠化 | 明显时间跨越 |
| 几天 | 淡入淡出(Fade) | 段落分隔 |
| 更长时间 | 淡入淡出(Fade) | 重大时间跨越 |

### 基于情绪氛围

| 情绪氛围 | 推荐转场 | 原因 |
|---------|---------|------|
| 紧张、快节奏 | 切(Cut) | 保持紧张感 |
| 柔和、诗意 | 叠化(Dissolve) | 流畅过渡 |
| 沉思、沉重 | 淡入淡出(Fade) | 情绪沉淀 |
| 轻快、有趣 | 划像(Wipe) | 风格化 |
| 碎片化、实验 | 跳切(Jump Cut) | 打破常规 |
| 巧妙、优雅 | 匹配剪辑(Match Cut) | 艺术化 |
| 沉浸、流畅 | 无缝转场(Seamless) | 长镜头感 |

### 基于场景关系

| 场景关系 | 推荐转场 | 原因 |
|---------|---------|------|
| 同一地点连续 | 切(Cut) | 保持连贯 |
| 不同地点无关联 | 淡入淡出(Fade) | 明确分隔 |
| 不同地点有关联 | 叠化(Dissolve) | 暗示关联 |
| 平行叙事 | 切(Cut) - 交叉剪辑 | 保持节奏 |
| 回忆/梦境 | 叠化(Dissolve) | 虚实过渡 |
| 快速地点切换 | 划像(Wipe) 或 跳切 | 快节奏 |

---

## 转场频率建议

| 转场方式 | 使用频率 | 备注 |
|---------|---------|------|
| 切(Cut) | 85-95% | 主力转场 |
| 淡入淡出(Fade) | 2-5% | 段落分隔 |
| 叠化(Dissolve) | 3-8% | 情绪延续 |
| 划像(Wipe) | 0-2% | 风格化使用 |
| 跳切(Jump Cut) | 0-3% | 特定场景 |
| 匹配剪辑(Match Cut) | 0-2% | 艺术化点缀 |
| L-Cut/J-Cut | 5-10% | 对话转场 |
| 无缝转场(Seamless) | 0-1% | 技术展示 |

---

## 竖屏转场特殊规则

### 9:16构图调整

1. **切(Cut)**：
   - 竖屏最常用转场
   - 快节奏切换保持紧凑
   - 景别切换频繁

2. **淡入淡出(Fade)**：
   - 竖屏淡出效果明显
   - 适合段落转换
   - 淡出至黑为主

3. **叠化(Dissolve)**：
   - 竖屏叠化柔和
   - 适合情绪延续
   - 时长1-3秒为宜

4. **划像(Wipe)**：
   - 竖屏适合纵向划像
   - 横向划像受限
   - 圆形划像效果好

5. **跳切(Jump Cut)**：
   - 竖屏跳切节奏快
   - 适合短视频风格
   - 时间压缩效果好

6. **匹配剪辑(Match Cut)**：
   - 竖屏匹配剪辑集中
   - 形状匹配效果好
   - 需精心设计

7. **无缝转场(Seamless)**：
   - 竖屏无缝转场难度高
   - 遮挡转场可行
   - 需配合运镜

---

## 转场设计原则

### 1. 服务叙事原则
- 转场必须服务于叙事目的
- 不为转场而转场
- 避免炫技式转场

### 2. 节奏匹配原则
- 快节奏用切(Cut)
- 慢节奏可用淡入淡出/叠化
- 保持整体节奏一致

### 3. 情绪延续原则
- 转场要匹配情绪氛围
- 紧张场景避免慢转场
- 柔和场景避免硬切

### 4. 简洁优先原则
- 85-95%使用切(Cut)
- 特殊转场只在必要时使用
- 避免转场方式过多

### 5. 观众感知原则
- 好的转场应该"看不见"
- 转场不应打断观众沉浸
- 除非有特殊目的（风格化）

---

## 转场与镜头语言配合

### 切(Cut)配合规则

**180度轴线规则**：
- 保持轴线一致
- 避免跳轴（除非有意为之）

**30度规则**：
- 两个镜头角度差异>30度
- 避免小角度切换（显得跳跃）

**动作匹配**：
- 在动作中间切换
- 保持动作连贯性

**视线匹配**：
- 人物视线方向一致
- A看右→B看左

### 淡入淡出配合

**镜头类型**：
- 淡出前：中景/近景
- 淡入后：远景/全景（建立新环境）

**节奏**：
- 淡出前：镜头静止或缓慢运动
- 淡入后：从静止开始

### 叠化配合

**画面关联**：
- 两画面有视觉关联（色调/构图）
- 或有主题关联

**镜头稳定**：
- 叠化前后镜头相对稳定
- 避免快速运动

---

## 转场设计检查清单

设计转场时，检查以下问题：

- [ ] 85-95%是否使用切(Cut)？
- [ ] 转场是否服务叙事？
- [ ] 转场是否匹配节奏？
- [ ] 转场是否匹配情绪？
- [ ] 时间跨越是否明确？
- [ ] 场景关系是否清晰？
- [ ] 特殊转场是否必要？
- [ ] 转场是否打断沉浸？
- [ ] 竖屏转场是否适配？
- [ ] 转场频率是否合理？

---

## 常见错误

### ❌ 错误1：特殊转场过多
大量使用划像、叠化等

**正确做法**：85-95%使用切(Cut)

### ❌ 错误2：转场不匹配节奏
快节奏场景用淡入淡出

**正确做法**：快节奏用切(Cut)

### ❌ 错误3：转场无目的
为了炫技而使用复杂转场

**正确做法**：转场必须服务叙事

### ❌ 错误4：时间跨越不明
几天跨越用切(Cut)

**正确做法**：重大时间跨越用淡入淡出

### ❌ 错误5：跳轴
对话场景切换时跳轴

**正确做法**：保持180度轴线

---

## 经典转场案例

### 匹配剪辑经典

1. **《2001太空漫游》**：骨头→飞船（工具进化）
2. **《阿拉伯的劳伦斯》**：火柴→日出（形状匹配）
3. **《天使爱美丽》**：多处巧妙匹配剪辑

### 无缝转场经典

1. **《鸟人》**：全片伪长镜头
2. **《1917》**：战场无缝转场
3. **《地心引力》**：太空场景无缝

### 风格化转场经典

1. **《星球大战》**：标志性划像
2. **《精疲力尽》**：大量跳切
3. **《罗拉快跑》**：快节奏切换

---

## 使用建议

拍摄设计skill在设计转场时：

1. **优先使用切(Cut)**：85-95%
2. **时间跨越用淡入淡出**：几小时以上
3. **情绪延续用叠化**：回忆/梦境
4. **风格化慎用划像**：<2%
5. **对话转场用L/J-Cut**：平滑自然
6. **艺术化点缀匹配剪辑**：<2%
7. **竖屏转场适配**：纵向优先
8. **服务叙事原则**：不为转场而转场

---

**版本**：v1.0  
**最后更新**：2026-06-03

