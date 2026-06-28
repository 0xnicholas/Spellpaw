// scripts/migrate-research-skills.mjs
// Migrate research skills (under skills/SLUG/) into the runtime skill format
// (public/skills/SLUG.md) so the Copilot can use them.
//
// Each research skill is a directory:
//   skills/SLUG/SKILL.md            - frontmatter (name + description) + body
//   skills/SLUG/references/*.md     - supporting docs, lazily loaded
//
// The runtime format is a flat single .md file with full frontmatter
// (id, name, description, slashCommand, examples, parameters, required).
// References are concatenated to the body, each prefixed with a section
// header so the LLM can see the structure.
//
// Run with: node scripts/migrate-research-skills.mjs
// Output:
//   public/skills/SLUG.md                  - served by Vite at runtime
//   src/shared/copilot/skills/__fixtures__  - used by tests

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const SRC_DIR = path.join(ROOT, 'skills');
const OUT_PUBLIC = path.join(ROOT, 'public', 'skills');
const OUT_FIXTURES = path.join(ROOT, 'src', 'shared', 'copilot', 'skills', '__fixtures__');

/** Parse the small frontmatter at the top of a SKILL.md. */
function parseFrontmatter(md) {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!m) throw new Error('No frontmatter found');
  const [, yaml, body] = m;
  const meta = {};
  for (const line of yaml.split('\n')) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) {
      let value = kv[2].trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      meta[kv[1]] = value;
    }
  }
  return { meta, body };
}

/** Build a runtime frontmatter that satisfies the shared loader
 *  (id, name, description, slashCommand are required; the rest have
 *  sensible defaults). */
function buildRuntimeFrontmatter({ id, name, description }) {
  return [
    '---',
    `id: ${id}`,
    `name: ${name}`,
    `description: ${description.replace(/\n/g, ' ')}`,
    `slashCommand: ${id}`,
    'examples: []',
    'parameters: {}',
    'required: []',
    '---',
  ].join('\n');
}

/** Build the body by concatenating the original SKILL.md body + all
 *  references. Each reference gets an explicit section header so the
 *  LLM knows it's a separate doc. */
function buildRuntimeBody(skillDir, originalBody) {
  const refsDir = path.join(skillDir, 'references');
  const refs = fs.existsSync(refsDir)
    ? fs.readdirSync(refsDir).filter((f) => f.endsWith('.md')).sort()
    : [];
  if (refs.length === 0) return originalBody;

  const sections = ['\n\n---\n\n# References\n\n'];
  for (const ref of refs) {
    const content = fs.readFileSync(path.join(refsDir, ref), 'utf-8');
    sections.push(`## Reference: ${ref.replace(/\.md$/, '')}\n\n`);
    sections.push(content.trim());
    sections.push('\n\n');
  }
  return originalBody + sections.join('');
}

function migrateOne(skillDir) {
  const slug = path.basename(skillDir);
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    console.warn(`⚠ ${slug}/SKILL.md missing, skipping`);
    return null;
  }
  const raw = fs.readFileSync(skillMdPath, 'utf-8');
  const { meta, body } = parseFrontmatter(raw);

  const id = slug;
  const name = meta.name ?? slug;
  const description = meta.description ?? `Research skill: ${slug}`;

  const runtimeMd = [
    buildRuntimeFrontmatter({ id, name, description }),
    '',
    buildRuntimeBody(skillDir, body),
  ].join('\n');

  return { slug, runtimeMd };
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Source dir not found: ${SRC_DIR}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_PUBLIC, { recursive: true });
  fs.mkdirSync(OUT_FIXTURES, { recursive: true });

  const dirs = fs
    .readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(SRC_DIR, d.name))
    .sort();

  let migrated = 0;
  let skipped = 0;
  for (const dir of dirs) {
    const result = migrateOne(dir);
    if (!result) {
      skipped++;
      continue;
    }
    const outPub = path.join(OUT_PUBLIC, `${result.slug}.md`);
    const outFix = path.join(OUT_FIXTURES, `${result.slug}.md`);
    fs.writeFileSync(outPub, result.runtimeMd, 'utf-8');
    fs.writeFileSync(outFix, result.runtimeMd, 'utf-8');
    console.log(`✓ ${result.slug} → public/skills + __fixtures__`);
    migrated++;
  }

  console.log(`\nMigrated: ${migrated}, skipped: ${skipped}`);
}

main();