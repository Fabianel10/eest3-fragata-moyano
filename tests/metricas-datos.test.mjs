import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const admin = '00000000-0000-4000-8000-000000000001';
const revisor = '00000000-0000-4000-8000-000000000002';
const student = '00000000-0000-4000-8000-000000000003';
const postId = '00000000-0000-4000-8000-000000000010';

test('métricas: agregados sin datos personales, permisos, validación y retención', async (t) => {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb not null);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key, bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
  `);
  for (const file of ['202610060001_comunidad.sql', '202610060002_editorial.sql',
    '202610060003_catalogo.sql', '202610060004_carreras.sql', '202610200005_gestion.sql',
    '202611100008_equipo_editorial.sql', '202611100010_metricas.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  for (const id of [admin, revisor, student]) {
    await db.query('insert into auth.users values($1,$2,$3)', [id, `${id.slice(-4)}@example.test`, {
      full_name: 'Persona de prueba', requested_role: 'comunidad',
      email_notifications: false, privacy_version: '2026-10-06'
    }]);
  }
  await db.query("update public.profiles set role='administrador' where id=$1", [admin]);
  await db.query("update public.profiles set role='revisor' where id=$1", [revisor]);
  await db.query(`insert into public.institutional_posts(id,kind,title,body,career,audience,published_at)
    values($1,'comunicado','Publicación vigente','Contenido institucional de prueba.','','comunidad',now())`, [postId]);
  async function as(uid, action, role = 'authenticated') {
    await db.exec('begin');
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid || '']);
      await db.exec(`set local role ${role}`);
      const result = await action();
      await db.exec('commit');
      return result;
    } catch (error) { await db.exec('rollback'); throw error; }
  }
  const register = (metric, target, career = '') => as(null, () =>
    db.query('select public.metrics_register($1,$2,$3)', [metric, target, career]), 'anon');
  const summary = (days = 30, uid = admin) => as(uid, () =>
    db.query('select * from public.metrics_summary($1)', [days]));
  try {
    await t.test('registra páginas, publicaciones y búsquedas sin identificadores personales', async () => {
      await register('page_view', 'inicio');
      await register('page_view', 'inicio');
      await register('page_view', 'buscador');
      await register('search_used', 'carrera', 'informatica');
      await register('post_view', postId);
      const rows = await summary();
      const total = Object.fromEntries(rows.rows.map((r) => [`${r.metric}:${r.target}`, Number(r.total)]));
      assert.equal(total['page_view:inicio'], 2);
      assert.equal(total['page_view:buscador'], 1);
      assert.equal(total['search_used:carrera'], 1);
      assert.equal(total['post_view:' + postId], 1);
      const columns = await db.query(`select column_name from information_schema.columns
        where table_schema='public' and table_name='metrics_daily'`);
      assert.deepEqual(columns.rows.map((r) => r.column_name).sort(),
        ['career', 'count', 'day', 'metric', 'target', 'updated_at']);
    });

    await t.test('rechaza destinos, filtros y periodos inválidos', async () => {
      await assert.rejects(register('page_view', 'admin'), /Invalid page/);
      await assert.rejects(register('page_view', 'inicio', 'otra'), /Invalid career/);
      await assert.rejects(register('search_used', 'texto-libre'), /Invalid search filter/);
      await assert.rejects(register('post_view', '00000000-0000-4000-8000-000000000099'), /Invalid post/);
      await assert.rejects(register('click', 'inicio'), /Invalid metric/);
      await assert.rejects(summary(0), /Invalid period/);
      await assert.rejects(summary(400), /Invalid period/);
    });

    await t.test('solo el equipo editorial consulta; la tabla no es legible directamente', async () => {
      await assert.rejects(as(null, () => db.query('select * from public.metrics_daily'), 'anon'), /permission denied/);
      await assert.rejects(as(student, () => db.query('select * from public.metrics_daily')), /permission denied/);
      await assert.rejects(summary(30, student), /team permission/);
      assert.ok((await summary(30, revisor)).rows.length > 0);
      assert.ok((await summary(30, admin)).rows.length > 0);
    });

    await t.test('purga agregados con más de 365 días al registrar actividad', async () => {
      await db.query("insert into public.metrics_daily(day,metric,target,count) values(current_date-400,'page_view','inicio',9)");
      await register('page_view', 'historia');
      const old = await db.query("select count(*)::int n from public.metrics_daily where day=current_date-400");
      assert.equal(old.rows[0].n, 0);
    });
  } finally { await db.close(); }
});
