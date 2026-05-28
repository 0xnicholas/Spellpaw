/**
 * Storyboard PDF export — 分镜表 PDF 导出
 */
import { jsPDF } from 'jspdf';
import type { TreeNode, Project } from '@/types';

export function exportStoryboardPDF(project: Project, tree: TreeNode): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // ---- Header ----
  doc.setFontSize(14);
  doc.text(project.title, margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`${tree.children?.length ?? 0} acts · ${countNodes(tree, 'scene')} scenes · ${countNodes(tree, 'shot')} shots · ${tree.metadata?.duration ?? 0}s`, margin, y);
  y += 10;

  // ---- Acts ----
  for (const act of tree.children ?? []) {
    // Act header
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFillColor(245, 245, 250);
    doc.rect(margin, y - 4, pageW - margin * 2, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`${act.title}`, margin + 2, y + 1);
    y += 10;

    // Scenes
    for (const scene of act.children ?? []) {
      if (y > 260) { doc.addPage(); y = 20; }

      doc.setFontSize(9);
      doc.setTextColor(40);
      const statusIcon = { draft: '○', in_progress: '◐', review: '◑', done: '●' }[scene.status] ?? '';
      doc.text(`${statusIcon} ${scene.title}`, margin + 4, y);
      doc.setTextColor(120);
      const meta = scene.metadata;
      const metaStr = [
        meta?.duration ? `${meta.duration}s` : '',
        meta?.location ?? '',
        meta?.timeOfDay ?? '',
      ].filter(Boolean).join(' · ');
      doc.text(metaStr, pageW - margin - 4, y, { align: 'right' });
      y += 5;

      if (meta?.description) {
        doc.setFontSize(8);
        doc.setTextColor(130);
        const desc = meta.description.length > 80 ? meta.description.slice(0, 80) + '…' : meta.description;
        doc.text(desc, margin + 8, y);
        y += 4;
      }

      // Shots
      for (const shot of scene.children ?? []) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(8);
        doc.setTextColor(80);
        const sMeta = shot.metadata;
        const shotInfo = [
          sMeta?.shotType ?? '',
          sMeta?.cameraMovement ?? '',
          sMeta?.duration ? `${sMeta.duration}s` : '',
        ].filter(Boolean).join(' · ');
        doc.text(`  └ ${shot.title}${shotInfo ? ` — ${shotInfo}` : ''}`, margin + 8, y);
        y += 4;
      }
      y += 2;
    }
    y += 4;
  }

  // ---- Footer ----
  doc.setFontSize(7);
  doc.setTextColor(180);
  doc.text(`Exported from Spellpaw · ${new Date().toLocaleDateString('zh-CN')}`, margin, doc.internal.pageSize.getHeight() - 10);

  doc.save(`${project.title}_storyboard.pdf`);
}

function countNodes(tree: TreeNode, type: string): number {
  let count = tree.type === type ? 1 : 0;
  for (const child of tree.children ?? []) {
    count += countNodes(child, type);
  }
  return count;
}
