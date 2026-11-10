import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const admin = '00000000-0000-4000-8000-000000000001';
const revisor = '00000000-0000-4000-8000-000000000002';
const student = '00000000-0000-4000-8000-000000000003';

test('correo: cola persistente, reintentos, bajas, trazabilidad y permisos', async (t) => {
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
    '202611100008_equipo_editorial.sql', '202611100011_correo_cola.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  for (const [id, email] of [[admin, 'admin@example.test'], [revisor, 'revisor@example.test'], [student, 'alumno@example.test']]) {
    await db.query('insert into auth.users values($1,$2,$3)', [id, email, {
      full_name: 'Persona de prueba', requested_role: 'comunidad',
      email_notifications: false, privacy_version: '2026-10-06'
    }]);
  }
  await db.query("update public.profiles set role='administrador' where id=$1", [admin]);
  await db.query("update public.profiles set role='revisor' where id=$1", [revisor]);
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
  const request = (id = '00000000-0000-4000-8000-000000000010', overrides = {}) => ({
    nombre: 'Persona consultante', correo: 'persona@example.test', asunto: 'Consulta de prueba',
    mensaje: 'Mensaje suficientemente largo para la consulta.', categoria: 'general', carrera: '',
    privacidad: 'aceptada', ...overrides
  });
  const submit = (id, data = request(id)) => as(null, () => db.query(
    'select public.contact_submit($1,$2,$3)', [id, data, 'a'.repeat(64)]), 'service_role');
  const claim = (n = 5) => as(null, () => db.query('select * from public.email_claim($1)', [n]), 'service_role');
  try {
    await t.test('una consulta encola avisos para administración/revisión y comprobante', async () => {
      await submit('00000000-0000-4000-8000-000000000010');
      const rows = await db.query('select kind,recipient,status from public.email_outbox order by kind,recipient');
      assert.equal(rows.rows.length, 3);
      assert.deepEqual(rows.rows.map((r) => r.kind), ['contact_admin', 'contact_admin', 'contact_receipt']);
      assert.deepEqual(rows.rows.map((r) => r.recipient).sort(),
        ['admin@example.test', 'persona@example.test', 'revisor@example.test']);
      const events = await db.query("select action,count(*)::int n from public.email_events group by action");
      assert.deepEqual(events.rows, [{ action: 'queued', n: 3 }]);
      assert.equal((await db.query('select count(*)::int n from public.email_recipients')).rows[0].n, 2);
    });

    await t.test('reintento idéntico no duplica y la cola se reclama de forma atómica', async () => {
      await submit('00000000-0000-4000-8000-000000000010');
      assert.equal((await db.query('select count(*)::int n from public.email_outbox')).rows[0].n, 3);
      const first = await claim(2);
      assert.equal(first.rows.length, 2);
      assert.ok(first.rows.every((r) => r.status === 'sending' && r.attempts === 1));
      const second = await claim(5);
      assert.equal(second.rows.length, 1);
      assert.equal((await claim(5)).rows.length, 0);
      await db.query("update public.email_outbox set updated_at=now()-interval '20 minutes' where status='sending'");
      assert.ok((await claim(5)).rows.length >= 1, 'un envío interrumpido se recupera');
    });

    await t.test('envío confirmado y fallo programan estado y siguiente intento', async () => {
      const sending = await db.query("select id from public.email_outbox where status='sending' order by id");
      await as(null, () => db.query('select public.email_mark_sent($1,$2)', [sending.rows[0].id, 'provider-1']), 'service_role');
      await as(null, () => db.query('select public.email_mark_failed($1,$2)', [sending.rows[1].id, 'SMTP caído']), 'service_role');
      const sent = await db.query('select status,provider_message_id from public.email_outbox where id=$1', [sending.rows[0].id]);
      assert.deepEqual(sent.rows[0], { status: 'sent', provider_message_id: 'provider-1' });
      const retry = await db.query('select status,attempts,last_error,next_attempt_at>now() future from public.email_outbox where id=$1', [sending.rows[1].id]);
      assert.equal(retry.rows[0].status, 'pending');
      assert.ok(retry.rows[0].attempts >= 1);
      assert.match(retry.rows[0].last_error, /SMTP/);
      assert.equal(retry.rows[0].future, true);
      const events = await db.query("select action from public.email_events where outbox_id=$1 order by id", [sending.rows[1].id]);
      assert.deepEqual(events.rows.map((r) => r.action), ['queued', 'attempt', 'attempt', 'retry']);
    });

    await t.test('solo el servicio reclama; administración puede reintentar y ver el resumen', async () => {
      await assert.rejects(as(student, () => db.query('select * from public.email_claim(1)')), /permission denied/);
      await assert.rejects(as(null, () => db.query('select * from public.email_outbox'), 'anon'), /permission denied/);
      const failed = await db.query("select id from public.email_outbox where status='pending' limit 1");
      await db.query("update public.email_outbox set status='failed', attempts=max_attempts where id=$1", [failed.rows[0].id]);
      await as(admin, () => db.query('select public.email_retry($1)', [failed.rows[0].id]));
      const resumed = await db.query('select status,attempts,last_error from public.email_outbox where id=$1', [failed.rows[0].id]);
      assert.deepEqual(resumed.rows[0], { status: 'pending', attempts: 0, last_error: null });
      await assert.rejects(as(student, () => db.query('select public.email_admin_summary()')), /Administrator/);
      const summary = await as(admin, () => db.query('select public.email_admin_summary() as data'));
      assert.equal(Number(summary.rows[0].data.sent), 1);
      assert.equal(Number(summary.rows[0].data.recipients), 2);
      assert.ok(Array.isArray(summary.rows[0].data.recent));
    });

    await t.test('la baja invalida el token y cancela pendientes sin afectar consultas', async () => {
      const restantes = await db.query("select id from public.email_outbox where status='sending'");
      for (const row of restantes.rows) {
        await as(null, () => db.query('select public.email_mark_failed($1,$2)', [row.id, 'Prueba de baja']), 'service_role');
      }
      const token = (await db.query('select token from public.email_recipients where user_id=$1', [revisor])).rows[0].token;
      await as(null, () => db.query('select public.email_optout($1)', [token]), 'anon');
      assert.equal((await db.query('select enabled from public.email_recipients where user_id=$1', [revisor])).rows[0].enabled, false);
      assert.equal((await db.query("select count(*)::int n from public.email_outbox where lower(recipient)='revisor@example.test' and status in ('pending','failed')")).rows[0].n, 0);
      await submit('00000000-0000-4000-8000-000000000011');
      assert.equal((await db.query("select count(*)::int n from public.email_outbox where lower(recipient)='revisor@example.test' and status='pending'")).rows[0].n, 0);
      await as(null, () => db.query('select public.email_optout($1)', [token]), 'anon');
      assert.equal((await db.query("select count(*)::int n from public.email_optouts where lower(email)='revisor@example.test'")).rows[0].n, 1);
      assert.equal((await db.query('select count(*)::int n from public.contact_requests')).rows[0].n, 2);
    });
  } finally { await db.close(); }
});
