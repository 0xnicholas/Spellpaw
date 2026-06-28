/**
 * Minimal YAML frontmatter parser for skill `.md` files.
 *
 * Supports the subset we use:
 *
 *   key: value                    → string
 *   key: "quoted value"           → string (quotes stripped)
 *   key: [a, b, c]                → string[] (no quoting inside)
 *   key:                          → start of nested object (one level)
 *     subkey: value
 *     subkey2:
 *       deep: value               → nested up to 2 levels deep
 *
 * Anything beyond this (anchors, multi-line scalars, mixed types) is out
 * of scope. Skill frontmatter should stay flat and simple.
 *
 * Returns `{ meta, body }` where `body` is everything after the closing
 * `---`. Throws if the frontmatter is missing or malformed.
 */

export interface ParsedFrontmatter {
  meta: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(md: string): ParsedFrontmatter {
  // Strip leading whitespace, then look for the opening `---` on line 1.
  const trimmed = md.replace(/^\s+/, '');
  if (!trimmed.startsWith('---')) {
    throw new Error('Frontmatter must start with `---` on the first line');
  }
  const afterOpening = trimmed.slice(3);
  // Find the closing `---` on its own line.
  const closingMatch = afterOpening.match(/\n---\s*(\n|$)/);
  if (!closingMatch) {
    throw new Error('Frontmatter closing `---` not found');
  }
  const yamlBlock = afterOpening.slice(0, closingMatch.index);
  const body = afterOpening.slice(closingMatch.index! + closingMatch[0].length);

  const meta = parseYamlBlock(yamlBlock);
  return { meta, body };
}

function parseYamlBlock(text: string): Record<string, unknown> {
  const lines = text.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
  return parseBlock(lines, 0, 0).value as Record<string, unknown>;
}

interface BlockResult {
  value: unknown;
  /** Index of the first line that was NOT consumed. */
  next: number;
}

/**
 * Parse a YAML block starting at `lines[start]` with the given indent.
 * Stops when indent drops below `indent`. Supports `key: value` entries,
 * inline arrays `[...]`, nested objects (one extra indent level), and
 * YAML list syntax (`- item` at indent+2).
 */
function parseBlock(lines: string[], start: number, indent: number): BlockResult {
  const result: Record<string, unknown> = {};
  let i = start;

  while (i < lines.length) {
    const line = lines[i]!;
    const lineIndent = leadingSpaces(line);

    // Stop when we see a line at lower indent (sibling block) or empty.
    if (lineIndent < indent) break;
    if (lineIndent > indent) {
      // Shouldn't happen with well-formed input; skip defensively.
      i++;
      continue;
    }

    // YAML list item at this indent → this whole block is a list.
    if (line.slice(indent).startsWith('- ')) {
      return parseList(lines, i, indent);
    }

    const entryMatch = line.slice(indent).match(/^([^\s:]+):\s*(.*)$/);
    if (!entryMatch) {
      i++;
      continue;
    }

    const key = entryMatch[1]!;
    const rawValue = entryMatch[2] ?? '';

    if (rawValue.trim() === '') {
      // Empty value → nested block at indent+2 (one level deep).
      const child = parseBlock(lines, i + 1, indent + 2);
      result[key] = child.value;
      i = child.next;
    } else if (rawValue.trim().startsWith('[') && rawValue.trim().endsWith(']')) {
      // Inline array: [a, b, c]
      const inner = rawValue.trim().slice(1, -1).trim();
      result[key] = inner === '' ? [] : splitTopLevelCommas(inner).map(stripQuotes);
      i++;
    } else if (rawValue.trim().startsWith('{') && rawValue.trim().endsWith('}')) {
      // Inline object: {} or { k: v, ... }
      const inner = rawValue.trim().slice(1, -1).trim();
      result[key] = inner === '' ? {} : parseInlineObject(inner);
      i++;
    } else {
      result[key] = stripQuotes(rawValue.trim());
      i++;
    }
  }

  return { value: result, next: i };
}

/**
 * Parse a YAML list at `lines[start]` — every line at `indent` must start
 * with `- `. Stops when indent drops below `indent`.
 */
function parseList(lines: string[], start: number, indent: number): BlockResult {
  const result: unknown[] = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i]!;
    const lineIndent = leadingSpaces(line);

    if (lineIndent < indent) break;
    if (lineIndent > indent) {
      i++;
      continue;
    }

    const itemMatch = line.slice(indent).match(/^-\s+(.*)$/);
    if (!itemMatch) break;

    const rawValue = itemMatch[1] ?? '';
    if (rawValue.trim() === '') {
      // `- ` followed by nested block on next lines (object list item)
      const child = parseBlock(lines, i + 1, indent + 4);
      result.push(child.value);
      i = child.next;
    } else if (rawValue.trim().startsWith('[') && rawValue.trim().endsWith(']')) {
      const inner = rawValue.trim().slice(1, -1).trim();
      result.push(inner === '' ? [] : splitTopLevelCommas(inner).map(stripQuotes));
      i++;
    } else {
      result.push(stripQuotes(rawValue.trim()));
      i++;
    }
  }

  return { value: result, next: i };
}

function parseInlineObject(text: string): Record<string, string> {
  const obj: Record<string, string> = {};
  const pairs = splitTopLevelCommas(text);
  for (const pair of pairs) {
    const colonIdx = pair.indexOf(':');
    if (colonIdx === -1) continue;
    const k = stripQuotes(pair.slice(0, colonIdx).trim());
    const v = stripQuotes(pair.slice(colonIdx + 1).trim());
    if (k) obj[k] = v;
  }
  return obj;
}

function leadingSpaces(line: string): number {
  let n = 0;
  while (n < line.length && line[n] === ' ') n++;
  return n;
}

function splitTopLevelCommas(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  let inQuote: '"' | "'" | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (inQuote) {
      current += ch;
      if (ch === inQuote) inQuote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      current += ch;
      continue;
    }
    if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function stripQuotes(s: string): string {
  if (s.length >= 2) {
    const first = s[0]!;
    const last = s[s.length - 1]!;
    if ((first === '"' || first === "'") && first === last) {
      return s.slice(1, -1);
    }
  }
  return s;
}
