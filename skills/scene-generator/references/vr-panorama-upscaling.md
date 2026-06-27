# VR全景图超分辨率工作流（🚧 尚未完成）

按需读取，不要全文复制进卡片。

## 概述

优化方案：先生成低分辨率VR全景图验证效果 → 超分放大 → 高清切片。

相比直接生成8K：成本降低75%，时间降低70%，支持快速预览验证。

## 完整工作流

```
阶段1：生成2048x1024低分辨率VR全景图（快速验证）
阶段2：切片预览检查构图和接缝
阶段3：超分辨率放大 → 8192x4096（4倍，Real-ESRGAN）
阶段4：高清切片输出1920x1080
```

## 分辨率建议

| 阶段 | 推荐分辨率 | 用途 |
|------|-----------|------|
| 初始生成 | 2048x1024 | 快速验证 |
| 超分放大 | 8192x4096（4x）| 高清切片源 |
| 切片输出 | 1920x1080 | 标准高清场景图 |

## 超分辨率工具

### 在线服务（无需安装）
- **Upscale.media** — 免费，2x/4x（推荐先测试）
- **Magnific AI** — $39/月，2x-16x，效果最好
- **Bigjpg** — 免费，专注动漫风格

### 开源工具（免费）
**Real-ESRGAN**（推荐）— 开源，4倍放大，需GPU

```bash
# macOS 安装
brew install xinntao/real-esrgan/realesrgan-ncnn-vulkan

# 使用
realesrgan-ncnn-vulkan -i input_2k.png -o output_8k.png -s 4 -n realesrgan-x4plus
```

Python集成：
```python
import subprocess
subprocess.run([
    'realesrgan-ncnn-vulkan',
    '-i', 'vr_panorama_2k.png',
    '-o', 'vr_panorama_8k.png',
    '-s', '4', '-n', 'realesrgan-x4plus', '-f', 'png'
], check=True)
```

### 商业软件
**Topaz Gigapixel AI** — $99一次性，6倍放大，效果业界最好

## 工作流最佳实践

1. **快速验证**：生成2K VR全景图
2. **预览切片**：`python vr_slice_tool.py --input vr_2k.png --views standard`
3. **超分放大**：确认满意后 `realesrgan-ncnn-vulkan -i vr_2k.png -o vr_8k.png -s 4`
4. **高清切片**：`python vr_slice_tool.py --input vr_8k.png --views cinematic`

## 注意事项

- 放大倍数：2048x1024 → 4x → 8192x4096（推荐）：2048x1024 → 2x → 4096x2048（标准）
- 超分不会修复接缝问题，2K阶段确保接缝质量
- 细节是AI推测而非原生，极复杂图案可能略有差异
- 建筑、室内、风景等几何结构清晰的场景效果好

## 实施状态

🚧 尚未完成。临时方案：手动上传到 Upscale.media 放大后下载。
