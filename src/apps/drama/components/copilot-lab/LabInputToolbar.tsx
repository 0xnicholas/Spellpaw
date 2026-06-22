/**
 * LabInputToolbar — Copilot Lab 输入区左侧：上传 + @ 引用 + 附件 chip
 *
 * 用法：渲染在 MessageInput 的 leftToolbar 槽里。
 *
 * Lab 特殊处理：
 *  - 画布为空时 @ 菜单内嵌 "Load Demo Canvas" 按钮（方便测试 UX）
 *  - 上传文件后用 chip 显示文件名（消息内容已自动注入）
 */
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  CanvasMentionButton,
  type CanvasMentionButtonProps,
} from '@chat/CanvasMentionButton';
import {
  FileUploadButton,
  UploadedFileChip,
  type UploadedFile,
  formatFileInsert,
} from '@chat/FileUploadButton';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import type { CanvasNode } from '@drama/types';

const DEMO_PROJECT_ID = '__copilot_lab_demo__';

function loadDemoCanvas() {
  const prevProjectId = useProjectStore.getState().currentProjectId;
  if (!prevProjectId) {
    useProjectStore.setState({ currentProjectId: DEMO_PROJECT_ID });
  }
  const store = useCanvasStore.getState();
  const demo: CanvasNode[] = [
    { id: 'demo-scene-1', type: 'sceneCard', position: { x: 0, y: 0 }, data: { title: 'Scene 1: 开场雨夜', description: '侦探在旧书店发现笔记本', status: 'draft' } },
    { id: 'demo-scene-2', type: 'sceneCard', position: { x: 320, y: 0 }, data: { title: 'Scene 2: 追逐', description: '天台追逐，镜头跟随', status: 'draft' } },
    { id: 'demo-scene-3', type: 'sceneCard', position: { x: 640, y: 0 }, data: { title: 'Scene 3: 对峙', description: '反派揭露真实身份', status: 'in_progress' } },
    { id: 'demo-char-1', type: 'character', position: { x: 0, y: 240 }, data: { title: '李墨', description: '主角 / 30 岁 / 侦探', status: 'draft' } },
    { id: 'demo-char-2', type: 'character', position: { x: 320, y: 240 }, data: { title: '神秘女子', description: '关键配角', status: 'draft' } },
  ];
  for (const node of demo) store.addNode(node);
}

const renderEmpty: NonNullable<CanvasMentionButtonProps['renderEmpty']> = () => (
  <div className="px-3 py-3 text-center">
    <div className="text-[11px] text-[var(--color-text-tertiary)]">
      Lab 当前无画布。
    </div>
    <div className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
      到 workspace 打开项目，或注入 demo 数据测试 UX：
    </div>
    <button
      onClick={loadDemoCanvas}
      className="mt-2 inline-flex items-center gap-1 rounded border border-[var(--color-accent-300)] bg-[var(--color-accent-50)] px-2 py-1 text-[11px] text-[var(--color-accent-700)] hover:bg-[var(--color-accent-100)]"
    >
      <Sparkles className="h-3 w-3" />
      Load Demo Canvas
    </button>
  </div>
);

export function LabInputToolbar() {
  const [pending, setPending] = useState<UploadedFile | null>(null);

  const handleUpload = (file: UploadedFile) => {
    setPending(file);
    // 立即注入消息
    window.dispatchEvent(new CustomEvent('spellpaw:insert-text', {
      detail: formatFileInsert(file),
    }));
  };

  return (
    <div className="flex items-center gap-1">
      <FileUploadButton onUpload={handleUpload} />
      <CanvasMentionButton renderEmpty={renderEmpty} />
      {pending && (
        <UploadedFileChip file={pending} onClear={() => setPending(null)} />
      )}
    </div>
  );
}