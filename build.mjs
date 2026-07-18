import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'dist');
const required = ['index.html', 'config.js', '_headers', 'data', 'assets'];

for (const entry of required) {
  await stat(path.join(root, entry));
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const entry of required) {
  await cp(path.join(root, entry), path.join(out, entry), { recursive: true });
}

// Keep the legacy root logo path working too.
try {
  await cp(path.join(root, 'ohio-trade-lab-logo.png'), path.join(out, 'ohio-trade-lab-logo.png'));
} catch {}
console.log('Cloudflare Pages output created in dist/.');
