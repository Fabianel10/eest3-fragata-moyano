import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const admin = '00000000-0000-4000-8000-000000000001';
const student = '00000000-0000-4000-8000-000000000002';
const other = '00000000-0000-4000-8000-000000000003';
test('notificaciones: preferencias, aislamiento, programación, duplicados y sincronización editorial', async t => {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key,bucket_id text,name text);
    alter table storage.objects enable row level security;
  `);
  for (const file of ['202610060001_comunidad.sql', '202610200005_gestion.sql', '202610200006_notificaciones.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  for (const id of [admin, student, other]) await db.query('insert into auth.users values($1,$2)', [id, {
    full_name: 'Persona de prueba', requested_role: 'comunidad', email_notifications: false, privacy_version: '2026-10-06'
  }]);
  await db.query("update public.profiles set role='administrador' where id=$1", [admin]);
  async function as(uid, work, role = 'authenticated') {
    await db.exec('begin');
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid || '']);
      await db.exec(`set local role ${role}`);
      const result = await work(); await db.exec('commit'); return result;
    } catch (error) { await db.exec('rollback'); throw error; }
  }
  let key = 10;
  const notice = overrides => ({
    request_id: `00000000-0000-4000-8000-${String(++key).padStart(12,'0')}`,
    title: 'Aviso institucional', body: 'Información de prueba sin datos personales.', topic: 'novedades', link: 'novedades.html',
    published_at: '2020-01-01T00:00:00Z', expires_at: null, ...overrides
  });
  const create = (data, uid = admin) => as(uid, () => db.query('select public.notification_create($1) as id', [data]));
  const list = (uid = student, before = null) => as(uid, () => db.query('select * from public.notifications_list($1)', [before]));
  const read = (id, uid = student) => as(uid, () => db.query('select public.notification_read($1)', [id]));
  try {
    let id;
    await t.test('solo admin crea; anónimo no accede y no se expone tabla de emisores', async () => {
      await assert.rejects(create(notice(), student), /Administrator/);
      await assert.rejects(as(null, () => db.query('select * from public.notifications_list(null)'), 'anon'), /permission denied/);
      id = (await create(notice())).rows[0].id;
      assert.equal((await list()).rows.length, 1);
      assert.equal((await as(student, () => db.query('select * from public.institutional_notifications'))).rows.length, 0);
      await assert.rejects(create(notice({ link:'https://attacker.invalid' })), /check constraint/);
    });
    await t.test('lectura idempotente, aislada por usuario e imposible falsificar destinatario', async () => {
      await read(id); await read(id);
      assert.ok((await list()).rows[0].read_at);
      assert.equal((await list(other)).rows[0].read_at, null);
      assert.equal((await as(other, () => db.query('select * from public.notification_receipts'))).rows.length, 0);
      await assert.rejects(as(student, () => db.query('insert into public.notification_receipts values($1,$2,now())', [other,id])), /permission denied/);
    });
    await t.test('temas y desactivación no dependen de consentimiento de correo', async () => {
      await create(notice({ topic:'calendario',link:'calendario.html' }));
      assert.equal((await list()).rows.length, 1);
      await db.query("update public.profiles set topics=array['calendario'] where id=$1", [student]);
      assert.equal((await list()).rows[0].topic, 'calendario');
      await assert.rejects(read(id), /unavailable/);
      await as(student, () => db.query('insert into public.notification_preferences values($1,false)', [student]));
      assert.equal((await list()).rows.length, 0);
      await assert.rejects(as(student, () => db.query('insert into public.notification_preferences values($1,false)', [other])), /row-level security/);
      await as(student, () => db.query('update public.notification_preferences set enabled=true'));
      await db.query("update public.profiles set topics=array['novedades'] where id=$1", [student]);
    });
    await t.test('programación, vencimiento, retiro e idempotencia de creación', async () => {
      await create(notice({ published_at:'2099-01-01T00:00:00Z' }));
      await create(notice({ expires_at:'2020-02-01T00:00:00Z' }));
      assert.equal((await list()).rows.length, 1);
      const data = notice();
      const first = (await create(data)).rows[0].id;
      assert.equal((await create(data)).rows[0].id, first);
      await assert.rejects(create({...data,title:'Otro título'}), /conflict/);
      await assert.rejects(as(student, () => db.query('select public.notification_withdraw($1)', [first])), /Administrator/);
      await as(admin, () => db.query('select public.notification_withdraw($1)', [first]));
      assert.equal((await list()).rows.length, 1);
      await assert.rejects(read(first), /unavailable/);
    });
    await t.test('publicar crea un aviso, editar no duplica ni pierde lectura; retirar lo oculta', async () => {
      const postId = '00000000-0000-4000-8000-000000000099';
      const data = {kind:'comunicado',title:'Comunicado para la comunidad',body:'Información pública de prueba.',career:'',audience:'comunidad',
        attachment_url:'',attachment_label:'',published_at:'2020-01-01T00:00:00Z',expires_at:null};
      const save = (document,version) => as(admin, () => db.query('select public.institutional_post_save($1,$2,$3)', [postId,version,document]));
      await save(data,0);
      const related = (await db.query('select id from public.institutional_notifications where source_post=$1',[postId])).rows[0].id;
      await read(related);
      await save({...data,title:'Comunicado corregido'},1);
      const row = (await list()).rows.find(row=>row.id===related);
      assert.equal(row.title,'Comunicado corregido'); assert.ok(row.read_at);
      assert.equal((await db.query('select id from public.institutional_notifications where source_post=$1',[postId])).rows.length,1);
      await save({...data,published_at:null},2);
      assert.ok(!(await list()).rows.some(row=>row.id===related));
    });
    await t.test('paginación por cursor sin repetir avisos', async () => {
      for(let i=0;i<27;i++) await create(notice());
      const first = (await list()).rows;
      const second = (await list(student, first.at(-1).id)).rows;
      assert.equal(first.length,25);
      assert.ok(second.length>0);
      assert.ok(!second.some(row=>first.some(prev=>prev.id===row.id)));
    });
  } finally { await db.close(); }
});
