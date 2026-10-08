import { rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const dir of ['.next', '.next-dev', 'node_modules/.cache']) {
  const full = join(root, dir);
  if (existsSync(full)) {
    rmSync(full, { recursive: true, force: true });
    console.log(`removed ${dir}`);
  }
}
