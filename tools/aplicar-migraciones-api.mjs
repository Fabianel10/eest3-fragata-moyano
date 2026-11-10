import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migrationsDir = resolve(root, 'supabase/migrations');
const args = process.argv.slice(2);
const fromIndex = args.indexOf('--from');
const from = fromIndex >= 0 ? args[fromIndex + 1] : null;
const all = args.includes('--all');
const dryRun = args.includes('--dry-run');
const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectUrl = process.env.SUPABASE_URL || '';
const ref = process.env.SUPABASE_PROJECT_REF || (() => {
  try { return new URL(projectUrl).hostname.split('.')[0]; } catch { return ''; }
})();
if (!token || !ref) {
  console.error('Faltan SUPABASE_ACCESS_TOKEN y SUPABASE_URL (o SUPABASE_PROJECT_REF).');
  console.error('El token es un Personal Access Token de Supabase, no la service_role.');
  process.exit(1);
}
if (!from && !all) {
  console.error('Indicá --from <prefijo> o --all.');
  process.exit(1);
}
const files = (await readdir(migrationsDir)).filter((file) => /^\d{8,}.*\.sql$/.test(file)).sort();
const index = from ? files.findIndex((file) => file.startsWith(from)) : 0;
if (index < 0) {
  console.error(`No se encontró una migración que empiece con ${from}.`);
  process.exit(1);
}

async function consultar(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(120000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Management API ${response.status}: ${text.slice(0, 300)}`);
  try { return { rows: JSON.parse(text) || [] }; } catch { return { rows: [] }; }
}

try {
  const exists = await consultar("select to_regclass('public.schema_migrations') as tabla");
  const tabla = Array.isArray(exists.rows) ? exists.rows[0]?.tabla : false;
  if (!dryRun) {
    await consultar(`create table if not exists public.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now(),
      baseline boolean not null default false,
      note text not null default ''
    );`);
  }
  let applied = new Set();
  if (tabla) {
    const rows = await consultar('select version from public.schema_migrations');
    applied = new Set((Array.isArray(rows.rows) ? rows.rows : []).map((row) => row.version));
  }
  if (from) {
    for (const file of files.slice(0, index)) {
      const version = file.replace(/\.sql$/, '');
      if (applied.has(version)) continue;
      if (dryRun) { console.log('BASE(dry)', file); continue; }
      await consultar(`insert into public.schema_migrations(version,baseline,note)
        values('${version}',true,'Migración previa verificada antes de automatizar') on conflict do nothing`);
      console.log('BASE', file);
    }
  }
  for (const file of files.slice(index)) {
    const version = file.replace(/\.sql$/, '');
    if (applied.has(version)) { console.log('SKIP', file); continue; }
    if (dryRun) { console.log('DRY ', file); continue; }
    try {
      await consultar(await readFile(resolve(migrationsDir, file), 'utf8'));
      await consultar(`insert into public.schema_migrations(version,note)
        values('${version}','Aplicada por tools/aplicar-migraciones-api.mjs')`);
      console.log('OK  ', file);
    } catch (error) {
      console.error('FAIL', file, error.message);
      throw error;
    }
  }
  console.log('Migraciones verificadas vía Management API. No se imprimieron credenciales.');
} catch (error) {
  console.error('No se pudo completar la activación.');
  process.exitCode = 1;
}
