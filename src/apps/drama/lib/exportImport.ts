import type { Project, CanvasNode, CanvasEdge } from '@drama/types';

const SCHEMA_VERSION = 1;

export interface ExportData {
  _schemaVersion: number;
  title: string;
  description: string;
  canvas: {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  };
}

export function exportProjectToJSON(
  project: Project,
  canvasNodes: CanvasNode[],
  canvasEdges?: CanvasEdge[],
) {
  const data: ExportData = {
    _schemaVersion: SCHEMA_VERSION,
    title: project.title,
    description: project.description,
    canvas: {
      nodes: canvasNodes ?? [],
      edges: canvasEdges ?? [],
    },
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title.replace(/\s+/g, '_').toLowerCase()}.spellpaw.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importProjectFromJSON(json: string): ExportData {
  const data = JSON.parse(json);
  if (!data._schemaVersion || data._schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: ${data._schemaVersion}`);
  }
  if (!data.title) {
    throw new Error('Missing required field: title');
  }
  // Support current `canvas` field or legacy `canvasNodes` fallback.
  const nodes = data.canvas?.nodes ?? data.canvasNodes ?? [];
  if (!Array.isArray(nodes)) {
    throw new Error('Missing required field: canvas.nodes');
  }
  return {
    _schemaVersion: data._schemaVersion,
    title: data.title,
    description: data.description ?? '',
    canvas: {
      nodes,
      edges: data.canvas?.edges ?? data.canvasEdges ?? [],
    },
  };
}
