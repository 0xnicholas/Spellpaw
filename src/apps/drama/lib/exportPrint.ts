/**
 * Print & export utilities — storyboard PDF + dialogue script
 *
 * PDF: uses hidden iframe + window.print() with inline CSS.
 * Zero dependencies.
 */

import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import type { CanvasNode, CardChild } from '@drama/types';

/* ------------------------------------------------------------------ */
// Helpers

function getProjectNodes(projectId: string): CanvasNode[] {
  return useCanvasStore.getState().canvases[projectId]?.nodes ?? [];
}

function findThumbnail(nodeId: string, projectId: string): string | undefined {
  const nodes = getProjectNodes(projectId);
  const card = nodes.find(
    (n) =>
      n.type === 'art' &&
      (n.data.linkedCardIds?.includes(nodeId) ||
        (n.data as { linkedTreeNodeId?: string }).linkedTreeNodeId === nodeId),
  );
  return card?.data.thumbnail;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

function getActs(nodes: CanvasNode[]): CanvasNode[] {
  return nodes
    .filter((n) => n.type === 'storyline' && n.data.metadata?.type === 'act')
    .sort((a, b) => a.position.x - b.position.x);
}

function getScenes(nodes: CanvasNode[]): CanvasNode[] {
  return nodes
    .filter((n) => n.type === 'sceneCard')
    .sort((a, b) => a.position.y - b.position.y);
}

function getSceneAct(scene: CanvasNode, acts: CanvasNode[]): CanvasNode | undefined {
  // Associate a scene with the nearest act to its left (by x position).
  return acts
    .filter((act) => act.position.x <= scene.position.x)
    .sort((a, b) => b.position.x - a.position.x)[0];
}

function getShots(scene: CanvasNode): CardChild[] {
  return (scene.data.children ?? []).filter((c) => c.type === 'shot');
}

/* ------------------------------------------------------------------ */
// Task 2.1 — Storyboard PDF (iframe print)

export function exportStoryboardPDF(projectId: string): void {
  const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
  if (!project) return;

  const nodes = getProjectNodes(projectId);
  const acts = getActs(nodes);
  const scenes = getScenes(nodes);

  if (acts.length === 0 && scenes.length === 0) return;

  const pages: string[] = [];

  // Cover page
  pages.push(`
    <div class="page cover">
      <h1>《${project.title}》</h1>
      <p class="subtitle">分镜表</p>
      <div class="meta">
        <p>${project.description || ''}</p>
        <p>总幕数: ${acts.length} · 总场景数: ${scenes.length}</p>
      </div>
    </div>
  `);

  // One page per scene
  for (const scene of scenes) {
    const act = getSceneAct(scene, acts);
    const shots = getShots(scene);
    const thumb = findThumbnail(scene.id, projectId);

    const shotRows = shots
      .map(
        (shot) => `
        <tr>
          <td>${shot.title}</td>
          <td>${(shot.data?.shotType as string) ?? '-'}</td>
          <td>${(shot.data?.cameraMovement as string) ?? '-'}</td>
          <td>${formatDuration((shot.data?.duration as number) ?? 0)}</td>
          <td class="dialogue">${(shot.data?.dialogue as string) ?? '-'}</td>
        </tr>
      `
      )
      .join('');

    pages.push(`
      <div class="page scene-page">
        <div class="scene-header">
          <div class="breadcrumb">${act?.data.title ?? ''} · ${scene.data.title}</div>
          <div class="scene-meta">
            <span>时长: ${formatDuration(scene.data.duration ?? 0)}</span>
            <span>地点: ${scene.data.location ?? '-'}</span>
            <span>时间: ${scene.data.timeOfDay ?? '-'}</span>
            <span>镜头数: ${shots.length}</span>
          </div>
        </div>
        ${thumb ? `<div class="thumb"><img src="${thumb}" alt="" /></div>` : ''}
        <p class="description">${scene.data.description ?? ''}</p>
        <table>
          <thead>
            <tr>
              <th>镜头</th><th>景别</th><th>运镜</th><th>时长</th><th>对白/动作</th>
            </tr>
          </thead>
          <tbody>${shotRows || '<tr><td colspan="5" class="empty">暂无镜头</td></tr>'}</tbody>
        </table>
      </div>
    `);
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>分镜表 — ${project.title}</title>
<style>
  @page { size: A4 portrait; margin: 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; font-size: 10pt; line-height: 1.5; color: #222; }
  .page { page-break-after: always; padding: 8mm; }
  .page:last-child { page-break-after: auto; }

  /* Cover */
  .cover { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; height: 100vh; }
  .cover h1 { font-size: 24pt; margin-bottom: 8pt; }
  .cover .subtitle { font-size: 14pt; color: #555; margin-bottom: 24pt; }
  .cover .meta { font-size: 10pt; color: #666; }

  /* Scene page */
  .scene-page { }
  .scene-header { margin-bottom: 8pt; border-bottom: 1px solid #ccc; padding-bottom: 6pt; }
  .breadcrumb { font-size: 9pt; color: #888; margin-bottom: 2pt; }
  .scene-meta { font-size: 9pt; color: #555; }
  .scene-meta span { margin-right: 12pt; }
  .thumb { width: 100%; max-height: 160px; overflow: hidden; margin: 8pt 0; text-align: center; }
  .thumb img { max-width: 100%; max-height: 160px; object-fit: contain; }
  .description { font-size: 9.5pt; color: #444; margin-bottom: 8pt; }

  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th, td { border: 1px solid #ddd; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #f5f5f5; font-weight: 600; }
  td.dialogue { max-width: 200px; }
  td.empty { color: #999; text-align: center; }
  tr:nth-child(even) { background: #fafafa; }
</style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;

  // Print via hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();

  // Wait for images then print
  const images = doc.querySelectorAll('img');
  let loaded = 0;
  if (images.length === 0) {
    triggerPrint();
  } else {
    images.forEach((img) => {
      if (img.complete) {
        loaded++;
        if (loaded === images.length) triggerPrint();
      } else {
        img.onload = img.onerror = () => {
          loaded++;
          if (loaded === images.length) triggerPrint();
        };
      }
    });
  }

  function triggerPrint() {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Cleanup after a delay (some browsers close print dialog synchronously)
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }
}

/* ------------------------------------------------------------------ */
// Task 2.2 — Dialogue script export (txt / csv)

interface ScriptRow {
  act: string;
  scene: string;
  shot: string;
  shotType: string;
  cameraMovement: string;
  duration: number;
  dialogue: string;
  description: string;
}

function buildScriptRows(nodes: CanvasNode[]): ScriptRow[] {
  const acts = getActs(nodes);
  const scenes = getScenes(nodes);
  const rows: ScriptRow[] = [];

  for (const scene of scenes) {
    const act = getSceneAct(scene, acts);
    const shots = getShots(scene);
    if (shots.length === 0) {
      rows.push({
        act: act?.data.title ?? '',
        scene: scene.data.title,
        shot: '-',
        shotType: '-',
        cameraMovement: '-',
        duration: scene.data.duration ?? 0,
        dialogue: scene.data.description ?? '',
        description: '',
      });
    } else {
      for (const shot of shots) {
        rows.push({
          act: act?.data.title ?? '',
          scene: scene.data.title,
          shot: shot.title,
          shotType: (shot.data?.shotType as string) ?? '-',
          cameraMovement: (shot.data?.cameraMovement as string) ?? '-',
          duration: (shot.data?.duration as number) ?? 0,
          dialogue: (shot.data?.dialogue as string) ?? '',
          description: (shot.data?.description as string) ?? '',
        });
      }
    }
  }
  return rows;
}

function escapeCSV(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportDialogueScript(projectId: string, format: 'txt' | 'csv' = 'txt'): void {
  const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
  if (!project) return;

  const nodes = getProjectNodes(projectId);
  const rows = buildScriptRows(nodes);
  const safeTitle = project.title.replace(/\s+/g, '_').toLowerCase();

  let content: string;
  let mime: string;
  let ext: string;

  if (format === 'csv') {
    const header = ['幕', '场景', '镜头', '景别', '运镜', '时长(秒)', '对白/动作', '描述'];
    const lines = [
      header.map(escapeCSV).join(','),
      ...rows.map((r) =>
        [r.act, r.scene, r.shot, r.shotType, r.cameraMovement, r.duration, r.dialogue, r.description]
          .map((v) => escapeCSV(String(v)))
          .join(',')
      ),
    ];
    content = '\uFEFF' + lines.join('\n');
    mime = 'text/csv;charset=utf-8';
    ext = 'csv';
  } else {
    // txt
    const lines: string[] = [`《${project.title}》对白脚本\n`, `共 ${rows.length} 条记录\n`];
    let currentScene = '';
    for (const r of rows) {
      const sceneLabel = `${r.act} · ${r.scene}`;
      if (sceneLabel !== currentScene) {
        currentScene = sceneLabel;
        lines.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        lines.push(`【${sceneLabel}】`);
        lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      }
      lines.push(`  [${r.shot}] ${r.shotType} · ${r.cameraMovement} · ${r.duration}s`);
      if (r.dialogue) lines.push(`    对白: ${r.dialogue}`);
      if (r.description) lines.push(`    描述: ${r.description}`);
      lines.push('');
    }
    content = lines.join('\n');
    mime = 'text/plain;charset=utf-8';
    ext = 'txt';
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeTitle}_script.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}
