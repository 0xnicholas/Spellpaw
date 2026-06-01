# ADR-012: 叙事模板格式

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

Spellpaw 需要叙事模板系统——用户可通过预设的故事结构快速创建项目。模板需要：
- 定义预设的幕/场景结构
- 携带默认元数据（标题、描述、时长、镜头类型建议）
- 包含风格参数（色调、节奏、平台适配）
- 可导入/导出为文件，支持社区分享

可选格式：
1. **JSON（`.spellpaw-template.json`）** — 结构化，可编程处理
2. **YAML** — 可读性更好，但解析依赖额外库
3. **二进制/压缩格式** — 节省空间，但不可人类阅读

## Decision

**使用 JSON 格式（`.spellpaw-template.json`），数据结构与项目树兼容。**

```typescript
interface NarrativeTemplate {
  id: string;                          // "template_suspense_reverse_001"
  name: string;                        // "悬疑反转短剧"
  category: 'suspense' | 'romance' | 'comedy' | 'drama' | 'action' | 'custom';
  description: string;                 // 模板描述
  thumbnail?: string;                  // 模板预览图 URL
  targetDuration: number;              // 建议时长（秒）：30 | 60 | 180 | 300
  targetPlatform: 'portrait' | 'landscape' | 'square';
  structure: {
    acts: {
      title: string;                   // "第一幕：表面平静"
      description: string;             // 本幕叙事目标
      scenes: {
        title: string;                 // "场景 1-1：日常场景"
        description: string;           // 场景概要
        suggestedShotTypes?: string[]; // ["wide", "close-up"]
        suggestedCameraMovement?: string;
        metadata: {                    // 与 TreeNodeMetadata 兼容
          duration?: number;
          location?: string;
          timeOfDay?: string;
        };
      }[];
    }[];
  };
  stylePresets: {
    colorPalette: string[];            // ["冷色调", "高对比"]
    pacing: 'fast' | 'moderate' | 'slow';
    visualStyle: string;               // "韩国冷色调文艺片"
  };
  tags: string[];                      // ["悬疑", "反转", "短剧"]
  author?: string;
  downloads?: number;
  version: number;                     // 模板格式版本
}
```

**模板来源：**
- **内置模板**（`public/templates/*.spellpaw-template.json`）— Phase 2 提供 10+ 个
- **用户自定义模板** — 从现有项目导出
- **AI 生成模板** — Agent 分析项目后自动生成

**版本策略：** `version` 字段用于格式迁移。Spellpaw 读取模板时检查 version，若低于当前版本则自动迁移。

**存储：**
- 内置模板：`public/templates/` 目录，构建时打包
- 用户模板：IndexedDB（`customTemplateStore`）
- 导出/分享：文件下载 + 文件导入

## Consequences

**Pros:**
- JSON 可被任何编程语言处理，降低社区贡献门槛
- 与项目 JSON 导出格式兼容
- 人类可读，方便手动编辑
- 无需额外解析库

**Cons:**
- JSON 不支持注释（模板作者无法在结构内写说明）
- 文件体积比二进制大（模板通常 < 10KB，可忽略）
- 版本迁移需要维护迁移逻辑

**Mitigations:**
- `description` 字段承载注释功能
- 模板文件小，体积不是问题
- 版本迁移逻辑在 `customTemplateStore` 中实现

---

*See also: ADR-003 (Local-First Storage), ADR-007 (State Management)*
