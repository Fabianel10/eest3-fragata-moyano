import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('auditoría automática de accesibilidad sin hallazgos', () => {
  const output = execFileSync(process.execPath, ['tools/auditoria-accesibilidad.mjs'], {
    cwd: new URL('../', import.meta.url), encoding: 'utf8'
  });
  assert.match(output, /Sin hallazgos automáticos de accesibilidad/);
});
