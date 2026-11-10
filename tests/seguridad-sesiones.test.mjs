import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const admin = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const sessionA = '00000000-0000-4000-8000-000000000010';
const sessionB = '00000000-0000-4000-8000-000000000011';
const sessionC = '00000000-0000-4000-8000-000000000012';

test('seguridad: 2FA obligatoria para administración y revisión de sesiones', async (t) => {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb not null);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
    create table auth.sessions(id uuid primary key, user_id uuid not null, created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(), user_agent text, ip text);
    create table auth.mfa_factors(id uuid primary key, user_id uuid not null, factor_type text not null, status text not null);
    grant usage on schema auth to anon, authenticated;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key, bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
  `);
  const files = ['202610060001_comunidad.sql', '202610060002_editorial.sql',
    '202610060003_catalogo.sql', '202610060004_carreras.sql', '202610200005_gestion.sql',
    '202610200006_notificaciones.sql', '202610200007_skynet.sql',
    '202611100008_equipo_editorial.sql', '202611100009_busqueda_global.sql',
    '202611100010_metricas.sql', '202611100011_correo_cola.sql',
    '202611100012_correo_respuestas.sql', '202611100013_calendario_gestion.sql',
    '202611100014_seguridad_sesiones.sql'];
  for (const file of files) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  for (const id of [admin, other]) {
    await db.query('insert into auth.users values($1,$2,$3)', [id, `${id.slice(-4)}@example.test`, {
      full_name: 'Persona de prueba', requested_role: 'comunidad',
      email_notifications: false, privacy_version: '2026-10-06'
    }]);
  }
  await db.query("update public.profiles set role='administrador' where id=$1", [admin]);
  await db.query('insert into auth.sessions(id,user_id,user_agent) values($1,$2,$3),($4,$5,$6),($7,$8,$9)',
    [sessionA, admin, 'Navegador A', sessionB, admin, 'Navegador B', sessionC, other, 'Navegador C']);
  async function as(uid, action, aal = 'aal1', role = 'authenticated') {
    await db.exec('begin');
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid || '']);
      await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({
        sub: uid || null, aal, session_id: sessionA
      })]);
      await db.exec(`set local role ${role}`);
      const result = await action();
      await db.exec('commit');
      return result;
    } catch (error) { await db.exec('rollback'); throw error; }
  }
  const requireMfa = (uid, enabled, aal = 'aal2') => as(uid, () => db.query(
    'select public.profile_mfa_require($1) as required', [enabled]), aal);
  const sessions = (uid = admin, aal = 'aal2') => as(uid, () => db.query('select * from public.auth_sessions_list()'), aal);
  try {
    await t.test('exigir 2FA requiere un factor verificado y no se puede activar sin él', async () => {
      await assert.rejects(requireMfa(admin, true), /factor TOTP/);
      await assert.rejects(requireMfa(other, true), /Administrator/);
      await db.query("insert into auth.mfa_factors values('00000000-0000-4000-8000-000000000099',$1,'totp','verified')", [admin]);
      assert.equal((await requireMfa(admin, true)).rows[0].required, true);
      assert.equal((await db.query('select mfa_required from public.profiles where id=$1', [admin])).rows[0].mfa_required, true);
    });

    await t.test('con 2FA exigida, AAL1 pierde permisos administrativos y AAL2 los recupera', async () => {
      assert.equal((await as(admin, () => db.query('select public.is_community_admin() as ok'), 'aal1')).rows[0].ok, false);
      assert.equal((await as(admin, () => db.query('select public.is_community_admin() as ok'), 'aal2')).rows[0].ok, true);
      await assert.rejects(as(admin, () => db.query('select public.profile_role_set($1,$2,$3)',
        [other, 'editor', '']), 'aal1'), /Administrator/);
      assert.equal((await requireMfa(admin, false, 'aal1')).rows[0].required, false);
    });

    await t.test('sesiones propias: lista marca la actual y permite revocar otras', async () => {
      const list = await sessions();
      assert.equal(list.rows.length, 2);
      assert.equal(list.rows.filter((row) => row.current).length, 1);
      assert.equal((await sessions(other)).rows.length, 1);
      const removed = await as(admin, () => db.query('select public.auth_sessions_revoke_others($1) as n', [sessionA]));
      assert.equal(removed.rows[0].n, 1);
      assert.equal((await db.query('select count(*)::int n from auth.sessions where user_id=$1', [admin])).rows[0].n, 1);
      assert.equal((await db.query('select count(*)::int n from auth.sessions where user_id=$1', [other])).rows[0].n, 1);
      await assert.rejects(as(admin, () => db.query('select public.auth_session_revoke($1)', [sessionC])), /not found/);
      await as(admin, () => db.query('select public.auth_session_revoke($1)', [sessionA]));
      assert.equal((await db.query('select count(*)::int n from auth.sessions where user_id=$1', [admin])).rows[0].n, 0);
    });
  } finally { await db.close(); }
});
