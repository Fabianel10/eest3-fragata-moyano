import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const admin = '00000000-0000-4000-8000-000000000001';
const postPublic = '00000000-0000-4000-8000-000000000010';
const postDraft = '00000000-0000-4000-8000-000000000011';

test('búsqueda global: vista unificada, RLS, publicaciones y calendario publicado', async (t) => {
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
    '202611100008_equipo_editorial.sql', '202611100009_busqueda_global.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  await db.query('insert into auth.users values($1,$2,$3)', [admin, 'admin@example.test', {
    full_name: 'Administración', requested_role: 'comunidad',
    email_notifications: false, privacy_version: '2026-10-06'
  }]);
  await db.query("update public.profiles set role='administrador' where id=$1", [admin]);
  await db.query(`insert into public.institutional_posts(id,kind,title,body,career,audience,published_at)
    values($1,'comunicado','Taller de informática abierto','Información pública sobre el taller.','informatica','comunidad',now())`, [postPublic]);
  await db.query(`insert into public.institutional_posts(id,kind,title,body,career,audience,published_at)
    values($1,'documento','Borrador privado','No debe aparecer en la búsqueda.','','comunidad',null)`, [postDraft]);
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
  try {
    await t.test('anónimos ven páginas, carreras, eventos y publicaciones vigentes', async () => {
      const rows = await as(null, () => db.query("select kind,count(*)::int n from public.search_index group by kind order by kind"), 'anon');
      const counts = Object.fromEntries(rows.rows.map((r) => [r.kind, r.n]));
      assert.equal(counts.pagina, 8);
      assert.equal(counts.carrera, 3);
      assert.equal(counts.evento, 32);
      assert.equal(counts.comunicado, 1);
      const titles = await as(null, () => db.query('select title from public.search_index'), 'anon');
      assert.deepEqual(titles.rows.map((r) => r.title).sort().includes('Borrador privado'), false);
      assert.deepEqual(titles.rows.map((r) => r.title).includes('Taller de informática abierto'), true);
    });

    await t.test('la vista respeta filtros por tipo, carrera y fecha', async () => {
      const carreras = await as(null, () => db.query("select title,career from public.search_index where kind='carrera' order by career"), 'anon');
      assert.deepEqual(carreras.rows.map((r) => r.career), ['informatica', 'madera', 'obras']);
      const filtro = await as(null, () => db.query("select title from public.search_index where career='informatica' and kind in ('carrera','comunicado')"), 'anon');
      assert.equal(filtro.rows.length, 2);
      const fechas = await as(null, () => db.query("select id from public.search_index where result_date between '2026-07-01' and '2026-07-31'"), 'anon');
      assert.ok(fechas.rows.length >= 1);
    });

    await t.test('el calendario publicado reemplaza los eventos estáticos sin duplicarlos', async () => {
      await db.query(`insert into public.cms_pages(slug,draft,version,status)
        values('calendario',$1,1,'publicado')`, [JSON.stringify({ modules: { events: [] } })]);
      const content = {
        title: 'Calendario', description: 'Agenda', blocks: [{ id: 'b0' }],
        chrome: {}, modules: { year: 2026, gallery: [], playlist: [], events: [{
          date: '2026-11-20', title: 'Jornada publicada', type: 'tecnica',
          description: 'Evento desde el CMS', image: ''
        }] }
      };
      await db.query(`insert into public.cms_published(slug,content,version,published_at)
        values('calendario',$1,1,now())`, [JSON.stringify(content)]);
      const rows = await as(null, () => db.query("select title from public.search_index where kind='evento' order by title"), 'anon');
      assert.deepEqual(rows.rows.map((r) => r.title), ['Jornada publicada']);
    });

    await t.test('no se puede escribir el índice ni saltar RLS de publicaciones', async () => {
      await assert.rejects(as(null, () => db.query("insert into public.search_static(id,kind,title,url) values('x','pagina','X','index.html')"), 'anon'), /permission denied/);
      assert.equal((await as(null, () => db.query("select * from public.search_index where title='Borrador privado'"), 'anon')).rows.length, 0);
    });
  } finally { await db.close(); }
});
