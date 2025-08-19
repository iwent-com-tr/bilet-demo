// json-loader.mjs – Node 20 ESM JSON loader
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    const filePath = fileURLToPath(url);
    const source = await readFile(filePath, 'utf8');
    return {
      format: 'module',
      source: `export default ${source};`,
      shortCircuit: true // zinciri burada bitir
    };
  }
  // JSON değilse zinciri devam ettir
  return nextLoad(url, context);
}

