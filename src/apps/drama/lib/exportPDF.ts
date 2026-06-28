/**
 * Storyboard PDF export — 分镜表 PDF 导出
 *
 * Replaces the legacy tree-based version that read `tree.children` and
 * `tree.metadata` (Phase 1, deleted in commit 8d68642). Iterates the
 * canvas nodes directly, using `CanvasNodeType` and the canonical
 * `CardMetadata` shape.
 */
import { jsPDF } from 'jspdf';
import type { Project, CanvasNode, CardMetadata } from '@drama/types';

type PdfProject = Pick<Project, 'title'>;

const STATUS_ICON: Record<string, string> = {
  draft: '○',
  in_progress: '◐',
  review: '◑',
  done: '●',
};

function metaOf(card: CanvasNode): CardMetadata {
  return card.data.metadata ?? {};
}

function totalDuration(nodes: CanvasNode[]): number {
  return nodes.reduce((sum, n) => sum + (metaOf(n).duration ?? 0), 0);
}

export function exportStoryboardPDF(project: PdfProject, canvasNodes: CanvasNode[]): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 20;

  const acts = canvasNodes.filter((n) => n.type === 'storyline' && metaOf(n).type === 'act');
  const scenes = canvasNodes.filter((n) => n.type === 'sceneCard');
  // Art/shot nodes are rendered as children of scenes via metadata.children (legacy),
  // or top-level "shot" cards. We just count them here for the header.
  const shots = canvasNodes.filter(
    (n) => n.type === 'art' || metaOf(n).type === 'shot',
  );

  // ---- Header ----
  doc.setFontSize(14);
  doc.text(project.title, margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `${acts.length} acts · ${scenes.length} scenes · ${shots.length} shots · ${totalDuration(canvasNodes)}s`,
    margin,
    y,
  );
  y += 10;

  // ---- Acts / Scenes / Shots ----
  // Iterate over scenes in order; if no scenes exist, fall back to acts.
  const sections = scenes.length > 0 ? scenes : acts;
  for (const section of sections) {
    if (y > pageH - 40) {
      doc.addPage();
      y = 20;
    }

    // Section header
    doc.setFillColor(245, 245, 250);
    doc.rect(margin, y - 4, pageW - margin * 2, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(section.data.title || '(untitled)', margin + 2, y + 1);
    y += 10;

    // Section metadata
    const m = metaOf(section);
    const sectionStatus = section.data.status ?? 'draft';
    const statusIcon = STATUS_ICON[sectionStatus] ?? '';
    doc.setFontSize(9);
    doc.setTextColor(40);
    const sectionMeta = [
      statusIcon,
      m.location ?? '',
      m.timeOfDay ?? '',
      m.duration ? `${m.duration}s` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    doc.text(sectionMeta, margin + 4, y);
    y += 5;

    if (m.description) {
      doc.setFontSize(8);
      doc.setTextColor(130);
      const desc = m.description.length > 80 ? m.description.slice(0, 80) + '…' : m.description;
      doc.text(desc, margin + 8, y);
      y += 4;
    }

    // Shots/children — either linked via metadata.children or top-level art
    const children = (m.children ?? []) as Array<{ title: string; type?: string; data?: Record<string, unknown> }>;
    const shotsToRender = children.length > 0
      ? children
      : canvasNodes
          .filter((n) => n.id !== section.id && (n.type === 'art' || metaOf(n).type === 'shot'))
          .map((n) => ({ title: n.data.title, type: 'shot', data: n.data as Record<string, unknown> }));

    for (const shot of shotsToRender) {
      if (y > pageH - 20) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(8);
      doc.setTextColor(80);
      const shotData = (shot.data ?? {}) as CardMetadata;
      const shotInfo = [
        shotData.shotType ?? '',
        shotData.cameraMovement ?? '',
        shotData.duration ? `${shotData.duration}s` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      doc.text(`  └ ${shot.title ?? '(untitled)'}${shotInfo ? ` — ${shotInfo}` : ''}`, margin + 8, y);
      y += 4;
    }
    y += 4;
  }

  // ---- Footer ----
  doc.setFontSize(7);
  doc.setTextColor(180);
  doc.text(
    `Exported from SpellPaw · ${new Date().toLocaleDateString('zh-CN')}`,
    margin,
    pageH - 10,
  );

  doc.save(`${project.title}_storyboard.pdf`);
}
