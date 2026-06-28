/**
 * Vite plugin — auto-generates public/skills/index.json from .md files.
 *
 * Dev: watches the public/skills/ directory and regenerates on change.
 * Build: emits index.json as an asset.
 *
 * The index.json file is gitignored (generated at build time).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const SKILLS_DIR = path.resolve(__dirname, 'public/skills');

function regenerate() {
  if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
  }
  const files = fs.readdirSync(SKILLS_DIR).filter((f) => f.endsWith('.md'));
  const ids = files.map((f) => f.replace(/\.md$/, ''));
  // Sort for deterministic output
  ids.sort();
  const json = JSON.stringify({ skills: ids }, null, 2);
  fs.writeFileSync(path.join(SKILLS_DIR, 'index.json'), json, 'utf-8');
}

export function skillManifestPlugin(): Plugin {
  return {
    name: 'skill-manifest',
    configureServer(server) {
      regenerate();
      server.watcher.on('add', (f) => {
        if (f.includes('public/skills/') && f.endsWith('.md')) regenerate();
      });
      server.watcher.on('unlink', (f) => {
        if (f.includes('public/skills/') && f.endsWith('.md')) regenerate();
      });
    },
    generateBundle() {
      // Build mode: emit index.json once
      const skillsDir = path.resolve(__dirname, 'public/skills');
      if (!fs.existsSync(skillsDir)) return;
      const files = fs.readdirSync(skillsDir).filter((f) => f.endsWith('.md'));
      const ids = files.map((f) => f.replace(/\.md$/, ''));
      ids.sort();
      this.emitFile({
        type: 'asset',
        fileName: 'skills/index.json',
        source: JSON.stringify({ skills: ids }, null, 2),
      });
    },
  };
}
