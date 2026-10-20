import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const admin = '00000000-0000-4000-8000-000000000001';
const student = '00000000-0000-4000-8000-000000000002';
const requestId = '00000000-0000-4000-8000-000000000003';
const postId = '00000000-0000-4000-8000-000000000004';
test('gestión: privacidad, reintentos, límite persistente, conflictos y publicaciones', async t => {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key,bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant select,insert,update,delete on storage.objects to anon, authenticated;
  `);
  for (const file of ['202610060001_comunidad.sql', '202610200005_gestion.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  for (const id of [admin, student]) {
    await db.query('insert into auth.users values ($1,$2)', [id, {
      full_name: 'Equipo prueba', requested_role: 'comunidad', email_notifications: false, privacy_version: '2026-10-06'
    }]);
  }
  await db.query("update public.profiles set role='administrador' where id=$1", [admin]);
  async function as(role, uid, action) {
    await db.exec('begin');
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid || '']);
      await db.exec(`set local role ${role}`);
      const result = await action(); await db.exec('commit'); return result;
    } catch (error) { await db.exec('rollback'); throw error; }
  }
  const payload = { nombre: 'Equipo prueba', correo: 'equipo@example.invalid', asunto: 'Prueba de consulta',
    mensaje: 'Mensaje técnico de prueba.', categoria: 'general', carrera: '', privacidad: 'aceptada' };
  const submit = (id = requestId, data = payload, hash = 'a'.repeat(64), role = 'service_role') =>
    as(role, null, () => db.query('select public.contact_submit($1,$2,$3)', [id, data, hash]));
  const document = { kind: 'comunicado', title: 'Información verificada', body: 'Contenido institucional de prueba.',
    career: '', audience: 'comunidad', attachment_url: '', attachment_label: '', published_at: null, expires_at: null };
  const savePost = (data, version, uid = admin) => as('authenticated', uid, () => db.query(
    'select public.institutional_post_save($1,$2,$3)', [postId, version, data]));
  try {
    await t.test('solo función de servidor acepta consultas; anónimos no leen ni escriben', async () => {
      await assert.rejects(submit(requestId, payload, 'a'.repeat(64), 'anon'), /permission denied/);
      await submit();
      await assert.rejects(as('anon', null, () => db.query('select * from public.contact_requests')), /permission denied/);
      assert.equal((await as('authenticated', student, () => db.query('select * from public.contact_requests'))).rows.length, 0);
      await assert.rejects(as('authenticated', admin, () => db.query("update public.contact_requests set status='cerrada'")), /permission denied/);
      await assert.rejects(as('authenticated', admin, () => db.query('select * from public.contact_rate_limits')), /permission denied/);
    });
    await t.test('reintento idéntico no duplica, datos distintos provocan conflicto', async () => {
      await submit();
      assert.equal((await db.query('select * from public.contact_requests')).rows.length, 1);
      await assert.rejects(submit(requestId, { ...payload, mensaje: 'Otro mensaje diferente.' }), /Idempotency conflict/);
      assert.equal((await db.query('select count from public.contact_rate_limits')).rows[0].count, 1);
    });
    await t.test('límite de cinco consultas/hora y validación de base', async () => {
      for (let i = 10; i < 14; i++) await submit(`00000000-0000-4000-8000-0000000000${i}`);
      await assert.rejects(submit('00000000-0000-4000-8000-000000000099'), /Contact rate limit/);
      await db.exec("update public.contact_rate_limits set window_start=now()-interval '2 hours'");
      await submit('00000000-0000-4000-8000-000000000099');
      await assert.rejects(submit('00000000-0000-4000-8000-000000000098', { ...payload, categoria: 'invalida' }), /check constraint/);
      await assert.rejects(submit('00000000-0000-4000-8000-000000000097', { ...payload, privacidad: '' }), /Invalid contact input/);
    });
    await t.test('solo admin gestiona, audita notas, detecta conflicto y elimina datos', async () => {
      const manage = (uid, version, assignee = admin) => as('authenticated', uid, () => db.query(
        'select public.contact_manage($1,$2,$3,$4,$5)', [requestId, version, 'revision', assignee, 'Nota interna']));
      await assert.rejects(manage(student, 1), /Administrator/);
      await assert.rejects(manage(admin, 1, student), /Invalid assignee/);
      await manage(admin, 1);
      await assert.rejects(manage(admin, 1), /Concurrent/);
      assert.equal((await db.query('select * from public.contact_history')).rows.length, 1);
      assert.equal((await as('authenticated', student, () => db.query('select * from public.contact_history'))).rows.length, 0);
      await as('authenticated', admin, () => db.query('select public.contact_delete($1,2)', [requestId]));
      assert.equal((await db.query('select * from public.contact_history')).rows.length, 0);
    });
    await t.test('publicaciones: borrador privado, publicación programada, caducidad y conflictos', async () => {
      await assert.rejects(savePost(document, 0, student), /Administrator/);
      await savePost(document, 0);
      const read = () => as('anon', null, () => db.query('select title from public.institutional_posts'));
      assert.equal((await read()).rows.length, 0);
      await savePost({ ...document, published_at: '2099-01-01T00:00:00Z' }, 1);
      assert.equal((await read()).rows.length, 0);
      await savePost({ ...document, published_at: '2020-01-01T00:00:00Z' }, 2);
      assert.equal((await read()).rows.length, 1);
      await assert.rejects(as('anon', null, () => db.query('select updated_by from public.institutional_posts')), /permission denied/);
      await assert.rejects(savePost(document, 2), /Concurrent/);
      await savePost({ ...document, published_at: '2020-01-01T00:00:00Z', expires_at: '2020-02-01T00:00:00Z' }, 3);
      assert.equal((await read()).rows.length, 0);
      await assert.rejects(savePost({ ...document, attachment_url: 'javascript:alert(1)', attachment_label: 'Inseguro' }, 4), /check constraint/);
      await assert.rejects(savePost({ ...document, attachment_url: 'https://user:pass@example.invalid/', attachment_label: 'Inseguro' }, 4), /check constraint/);
      await assert.rejects(savePost(document, 0), /Concurrent/);
      assert.equal((await db.query('select * from public.institutional_post_history')).rows.length, 4);
      assert.equal((await as('authenticated', student, () => db.query('select * from public.institutional_post_history'))).rows.length, 0);
      await assert.rejects(as('anon', null, () => db.query('select * from public.institutional_post_history')), /permission denied/);
    });
    await t.test('bucket PDF: altas solo de administración, sin sustitución ni borrado', async () => {
      const upload = uid => as('authenticated', uid, () => db.query(
        "insert into storage.objects values ($1,'institutional-documents',$2)", [requestId, `${requestId}.pdf`]));
      await assert.rejects(upload(student), /row-level security/);
      await upload(admin);
      const deleted = await as('authenticated', admin, () => db.query("delete from storage.objects returning id"));
      assert.equal(deleted.rows.length, 0);
      assert.equal((await as('anon', null, () => db.query('select * from storage.objects'))).rows.length, 1);
    });
  } finally { await db.close(); }
});
