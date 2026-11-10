import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const admin = '00000000-0000-4000-8000-000000000001';
const student = '00000000-0000-4000-8000-000000000002';
const eventId = '00000000-0000-4000-8000-000000000010';

test('calendario gestionado: publicación, fuente, responsable, RLS y búsqueda', async (t) => {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb not null);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
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
    '202611100012_correo_respuestas.sql', '202611100013_calendario_gestion.sql'];
  for (const file of files) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  for (const id of [admin, student]) {
    await db.query('insert into auth.users values($1,$2,$3)', [id, `${id.slice(-4)}@example.test`, {
      full_name: 'Persona de prueba', requested_role: 'comunidad',
      email_notifications: false, privacy_version: '2026-10-06'
    }]);
  }
  await db.query("update public.profiles set role='administrador' where id=$1", [admin]);
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
  const document = {
    event_date: '2026-11-20', title: 'Jornada de educación técnica', type: 'tecnica',
    description: 'Actividad institucional con talleres y proyectos.', source: 'Resolución 123/26',
    responsible: 'Equipo directivo', published: false
  };
  const save = (uid, version, data = document) => as(uid, () => db.query(
    'select public.calendar_event_save($1,$2,$3) as event', [eventId, version, data]));
  try {
    await t.test('solo administración crea y publica con trazabilidad', async () => {
      await assert.rejects(save(student, 0), /Administrator/);
      const created = await save(admin, 0);
      assert.equal(created.rows[0].event.published, false);
      assert.equal(created.rows[0].event.source, 'Resolución 123/26');
      assert.equal(created.rows[0].event.responsible, 'Equipo directivo');
      assert.equal(created.rows[0].event.version, 1);
      assert.equal((await as(admin, () => db.query("select public.calendar_event_save($1,1,$2) as event",
        [eventId, { ...document, published: false }]))).rows[0].event.published, false);
    });

    await t.test('borradores no son públicos; publicados sí y aparecen en búsqueda', async () => {
      assert.equal((await as(null, () => db.query('select * from public.calendar_events'), 'anon')).rows.length, 0);
      await as(admin, () => db.query('select public.calendar_event_save($1,2,$2)', [eventId, { ...document, published: true }]));
      assert.equal((await as(null, () => db.query('select * from public.calendar_events'), 'anon')).rows.length, 1);
      const search = await as(null, () => db.query("select title,result_date from public.search_index where id=$1", [`evento:db:${eventId}`]), 'anon');
      assert.equal(search.rows[0].title, 'Jornada de educación técnica');
      assert.equal(search.rows[0].result_date.toISOString().slice(0, 10), '2026-11-20');
    });

    await t.test('conflictos, validación y eliminación', async () => {
      await assert.rejects(save(admin, 1), /Concurrent/i);
      await assert.rejects(save(admin, 3, { ...document, type: 'inventado' }), /Invalid event/);
      await assert.rejects(save(admin, 3, { ...document, event_date: '2026-02-31' }), /date/);
      await assert.rejects(as(student, () => db.query('select public.calendar_event_delete($1,3)', [eventId])), /Administrator/);
      await as(admin, () => db.query('select public.calendar_event_delete($1,3)', [eventId]));
      assert.equal((await db.query('select * from public.calendar_events')).rows.length, 0);
    });
  } finally { await db.close(); }
});
