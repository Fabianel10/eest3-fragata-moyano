import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const catalogo = JSON.parse(await readFile(new URL('../assets/cms/catalogo.json', import.meta.url), 'utf8'));
const admin = '00000000-0000-4000-8000-000000000001';
const editor = '00000000-0000-4000-8000-000000000002';
const revisor = '00000000-0000-4000-8000-000000000003';
const student = '00000000-0000-4000-8000-000000000004';

test('equipo editorial: roles, envío a revisión, aprobación y atribución de publicación', async (t) => {
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
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `);
  for (const file of ['202610060001_comunidad.sql', '202610060002_editorial.sql',
    '202610060003_catalogo.sql', '202610060004_carreras.sql', '202611100008_equipo_editorial.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  for (const id of [admin, editor, revisor, student]) {
    await db.query('insert into auth.users values ($1,$2,$3)', [id, `${id.slice(-4)}@example.test`, {
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
  const setRole = (target, role, uid = admin, note = '') => as(uid, () => db.query(
    'select public.profile_role_set($1,$2,$3) as profile', [target, role, note]));
  const save = (uid, version = 0, doc = catalogo.inicio.defaults) => as(uid, () => db.query(
    'select public.cms_save_draft($1,$2::jsonb,$3) as page', ['inicio', JSON.stringify(doc), version]));
  const submit = (uid, version, note = 'Listo para revisión') => as(uid, () => db.query(
    'select public.cms_submit_review($1,$2,$3) as page', ['inicio', version, note]));
  const review = (uid, version, decision, note = 'Revisado') => as(uid, () => db.query(
    'select public.cms_review($1,$2,$3,$4) as page', ['inicio', version, decision, note]));
  const publish = (uid, version) => as(uid, () => db.query(
    'select public.cms_publish($1,$2) as page', ['inicio', version]));
  try {
    await t.test('solo administración asigna roles y el historial registra el cambio', async () => {
      await assert.rejects(setRole(editor, 'editor', student), /Administrator/);
      await setRole(editor, 'editor', admin, 'Alta de editor');
      await setRole(revisor, 'revisor', admin, 'Alta de revisor');
      const history = await db.query('select previous_role,new_role,note from public.profile_role_history order by id');
      assert.deepEqual(history.rows, [
        { previous_role: 'comunidad', new_role: 'editor', note: 'Alta de editor' },
        { previous_role: 'comunidad', new_role: 'revisor', note: 'Alta de revisor' }
      ]);
      await assert.rejects(setRole(admin, 'editor'), /propio rol/);
      await assert.rejects(setRole(editor, 'inventado'), /Invalid role/);
      assert.equal((await as(student, () => db.query('select * from public.profile_role_history'))).rows.length, 0);
    });

    await t.test('editor guarda y envía; no puede publicar ni revisar', async () => {
      const saved = await save(editor);
      assert.equal(saved.rows[0].page.version, 1);
      assert.equal(saved.rows[0].page.status, 'borrador');
      await assert.rejects(publish(editor, 1), /Administrator/);
      await assert.rejects(review(editor, 1, 'aprobado'), /Reviewer/);
      const sent = await submit(editor, 1);
      assert.equal(sent.rows[0].page.status, 'en_revision');
      assert.equal(sent.rows[0].page.submitted_by, editor);
      await assert.rejects(save(editor, 2), /under review/);
      const revisions = await db.query("select action,actor_role,note from public.cms_revisions where slug='inicio' order by id");
      assert.deepEqual(revisions.rows.map((row) => row.action), ['save', 'submit']);
      assert.equal(revisions.rows[1].actor_role, 'editor');
    });

    await t.test('revisor aprueba o rechaza; no edita y no revisa envíos propios', async () => {
      await assert.rejects(save(revisor, 2), /Editor permission/);
      const approved = await review(revisor, 2, 'aprobado', 'Contenido validado');
      assert.equal(approved.rows[0].page.status, 'aprobado');
      assert.equal(approved.rows[0].page.reviewed_by, revisor);
      assert.equal(approved.rows[0].page.review_note, 'Contenido validado');
      await assert.rejects(review(revisor, 3, 'aprobado'), /not under review/);
    });

    await t.test('publicar exige aprobación y registra quién aprobó y quién publicó', async () => {
      await assert.rejects(publish(admin, 2), /conflict/);
      const published = await publish(admin, 3);
      assert.equal(published.rows[0].page.status, 'publicado');
      assert.equal(published.rows[0].page.version, 4);
      const row = await db.query('select published_by,approved_by,version from public.cms_published where slug=$1', ['inicio']);
      assert.equal(row.rows[0].published_by, admin);
      assert.equal(row.rows[0].approved_by, revisor);
      assert.equal(row.rows[0].version, 4);
      const anon = await as(null, () => db.query('select content,version,published_at from public.cms_published where slug=$1', ['inicio']), 'anon');
      assert.equal(anon.rows.length, 1);
      await assert.rejects(as(null, () => db.query('select published_by from public.cms_published'), 'anon'), /permission denied/);
      const revisions = await db.query("select action,actor_role from public.cms_revisions where slug='inicio' order by id desc limit 1");
      assert.deepEqual(revisions.rows[0], { action: 'publish', actor_role: 'administrador' });
    });

    await t.test('una edición posterior invalida la aprobación y vuelve a borrador', async () => {
      const doc = structuredClone(catalogo.inicio.defaults);
      doc.title = 'Nuevo borrador';
      const saved = await save(editor, 4, doc);
      assert.equal(saved.rows[0].page.status, 'borrador');
      assert.equal(saved.rows[0].page.reviewed_by, null);
      assert.equal(saved.rows[0].page.submitted_by, null);
      assert.equal((await db.query('select content->>\'title\' as title from public.cms_published where slug=$1', ['inicio'])).rows[0].title,
        catalogo.inicio.defaults.title);
    });

    await t.test('la comunidad no accede a borradores; el equipo sí; el editor sube medios', async () => {
      assert.equal((await as(student, () => db.query('select * from public.cms_pages'))).rows.length, 0);
      assert.equal((await as(editor, () => db.query('select * from public.cms_pages'))).rows.length, 1);
      assert.equal((await as(revisor, () => db.query('select * from public.cms_revisions'))).rows.length > 0, true);
      const id = '00000000-0000-4000-8000-000000000010';
      await assert.rejects(as(student, () => db.query(
        "insert into storage.objects values($1,'institutional-media',$2)", [id, `${id}.png`])), /row-level/);
      await as(editor, () => db.query(
        "insert into storage.objects values($1,'institutional-media',$2)", [id, `${id}.png`]));
      await assert.rejects(as(revisor, () => db.query(
        "insert into storage.objects values($1,'institutional-media',$2)", [id, `${id}.png`])), /row-level/);
    });
  } finally { await db.close(); }
});
