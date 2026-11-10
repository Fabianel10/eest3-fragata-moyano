import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const root = resolve(import.meta.dirname, '..');
const migrationsDir = resolve(root, 'supabase/migrations');
const args = process.argv.slice(2);
const fromIndex = args.indexOf('--from');
const from = fromIndex >= 0 ? args[fromIndex + 1] : null;
const all = args.includes('--all');
const dryRun = args.includes('--dry-run');
const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('Falta SUPABASE_DB_URL (o DATABASE_URL) con la cadena de conexión de PostgreSQL.');
  console.error('Ejemplo: SUPABASE_DB_URL="postgresql://postgres.<ref>:<password>@aws-0-us-west-2.pooler.supabase.com:6543/postgres" npm run db:apply -- --from 202611100008');
  process.exit(1);
}
function normalizarConexion(value) {
  const parsed = new URL(value);
  if (/^db\.[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname)) {
    const labels = parsed.hostname.split('.');
    const ref = labels[0] === 'db' ? labels[1] : labels[0];
    parsed.hostname = process.env.SUPABASE_DB_POOLER_HOST || 'aws-0-us-west-2.pooler.supabase.com';
    parsed.port = '6543';
    parsed.username = `postgres.${ref}`;
    console.log('Conexión directa detectada: se usará el pooler de Supabase.');
    return parsed.toString();
  }
  return value;
}
const connectionString = normalizarConexion(url);
if (!from && !all) {
  console.error('Indicá --from <prefijo> para aplicar desde una migración concreta, o --all para un proyecto nuevo.');
  console.error('Para este proyecto: npm run db:apply -- --from 202611100008');
  process.exit(1);
}
const files = (await readdir(migrationsDir)).filter((file) => /^\d{8,}.*\.sql$/.test(file)).sort();
const index = from ? files.findIndex((file) => file.startsWith(from)) : 0;
if (index < 0) {
  console.error(`No se encontró una migración que empiece con ${from}.`);
  process.exit(1);
}
const client = new pg.Client({
  connectionString,
  ssl: /sslmode=disable/i.test(connectionString) ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 12000
});
try {
  await client.connect();
  if (!dryRun) {
    await client.query(`create table if not exists public.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now(),
      baseline boolean not null default false,
      note text not null default ''
    );`);
  }
  let applied = new Set();
  if (dryRun) {
    const exists = await client.query("select to_regclass('public.schema_migrations') as tabla");
    if (exists.rows[0].tabla) {
      applied = new Set((await client.query('select version from public.schema_migrations')).rows.map((row) => row.version));
    }
  } else {
    applied = new Set((await client.query('select version from public.schema_migrations')).rows.map((row) => row.version));
  }
  if (from) {
    for (const file of files.slice(0, index)) {
      const version = file.replace(/\.sql$/, '');
      if (!applied.has(version)) {
        if (dryRun) {
          console.log('BASE(dry)', file);
        } else {
          await client.query('insert into public.schema_migrations(version,baseline,note) values($1,true,$2) on conflict do nothing',
            [version, 'Migración previa verificada antes de automatizar']);
          console.log('BASE', file);
        }
      }
    }
  }
  for (const file of files.slice(index)) {
    const version = file.replace(/\.sql$/, '');
    if (applied.has(version)) {
      console.log('SKIP', file);
      continue;
    }
    if (dryRun) {
      console.log('DRY ', file);
      continue;
    }
    try {
      await client.query(await readFile(resolve(migrationsDir, file), 'utf8'));
      await client.query('insert into public.schema_migrations(version,note) values($1,$2)',
        [version, 'Aplicada por tools/aplicar-migraciones.mjs']);
      console.log('OK  ', file);
    } catch (error) {
      try { await client.query('rollback'); } catch { /* la transacción ya estaba cerrada */ }
      console.error('FAIL', file, error.message);
      throw error;
    }
  }
  console.log('Migraciones verificadas. No se imprimieron credenciales ni contenido SQL.');
} finally {
  await client.end().catch(() => {});
}
