import { readFile, stat } from 'node:fs/promises';
import vm from 'node:vm';

const required = ['index.html', 'config.js', '_headers', 'data/items.json', 'assets/ohio-trade-lab-logo.png'];
for (const file of required) await stat(file);
JSON.parse(await readFile('data/items.json', 'utf8'));
new vm.Script(await readFile('config.js', 'utf8'), { filename: 'config.js' });
const html = await readFile('index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(Boolean);
for (let i = 0; i < scripts.length; i++) new vm.Script(scripts[i], { filename: `index-inline-${i + 1}.js` });
if (/PASTE_YOUR|PASTE_D1|REPLACE_WITH_YOUR_EMAIL/.test(html + await readFile('config.js','utf8'))) {
  throw new Error('Public files contain an unfinished placeholder.');
}
console.log(`Checks passed: ${scripts.length} inline scripts, JSON, config, and required assets.`);
