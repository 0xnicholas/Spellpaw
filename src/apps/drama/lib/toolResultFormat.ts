import type { ToolResult } from '@drama/stores/toolRouter/types';

export function formatResult(result: ToolResult): string {
  return JSON.stringify(result);
}

export function parseToolResult(
  raw: string,
): { parsed: true; result: ToolResult } | { parsed: false; raw: string } {
  try {
    const obj = JSON.parse(raw);
    if (typeof obj.success === 'boolean' && typeof obj.summary === 'string') {
      return { parsed: true, result: obj as ToolResult };
    }
  } catch {
    // Not valid JSON — fallback to raw text
  }
  return { parsed: false, raw };
}
