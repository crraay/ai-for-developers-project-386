/**
 * Every ADR must declare its status in the header block (review follow-up, issue #38): a reader
 * should be able to tell at a glance whether a decision still stands without reading the whole
 * document. Both styles already in use are accepted - the blockquote line
 * (`> **Status: Accepted.**`, ADR-0003) and the section form (`## Status`, ADR-0008).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const adrDir = fileURLToPath(new URL('../docs/adr/', import.meta.url));
const files = readdirSync(adrDir).filter((name) => name.endsWith('.md'));

const missing = files.filter((name) => {
  const text = readFileSync(join(adrDir, name), 'utf8');
  return !/^> \*\*Status:/m.test(text) && !/^## Status\s*$/m.test(text);
});

if (missing.length > 0) {
  console.error(`ADR without a status line: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`all ${files.length} ADRs declare their status`);
