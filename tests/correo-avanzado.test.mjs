import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const admin = '00000000-0000-4000-8000-000000000001';
const revisor = '00000000-0000-4000-8000-000000000002';
const student = '00000000-0000-4000-8000-000000000003';
const requestId = '00000000-0000-4000-8000-000000000010';
const replyKey = '00000000-0000-4000-8000-000000000020';

test('correo avanzado: HTML, reply-to, alertas, rebotes y respuestas con hilo', async (t) => {
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
    '202611100012_correo_respuestas.sql'];
  for (const file of files) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
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
  const payload = { nombre: 'Persona consultante', correo: 'persona@example.test', asunto: 'Consulta técnica',
    mensaje: 'Mensaje de prueba con longitud suficiente.', categoria: 'general', carrera: '', privacidad: 'aceptada' };
  try {
    await t.test('los avisos incluyen HTML y reply-to; el comprobante no lleva reply-to', async () => {
      await as(null, () => db.query('select public.contact_submit($1,$2,$3)',
        [requestId, payload, 'a'.repeat(64)]), 'service_role');
      const rows = await db.query('select kind,recipient,html_body,reply_to from public.email_outbox order by kind,recipient');
      assert.equal(rows.rows.length, 3);
      const adminRow = rows.rows.find((row) => row.kind === 'contact_admin' && row.recipient === 'admin@example.test');
      assert.match(adminRow.html_body, /Nueva consulta recibida/);
      assert.equal(adminRow.reply_to, 'persona@example.test');
      const receipt = rows.rows.find((row) => row.kind === 'contact_receipt');
      assert.equal(receipt.reply_to, null);
      assert.match(receipt.html_body, /Recibimos tu consulta/);
      assert.match(receipt.html_body, /<html lang="es">/);
    });

    await t.test('un fallo definitivo genera una alerta interna sin recursión', async () => {
      const row = await db.query("select id from public.email_outbox where kind='contact_admin' limit 1");
      await db.query("update public.email_outbox set attempts=max_attempts, status='sending' where id=$1", [row.rows[0].id]);
      await as(null, () => db.query('select public.email_mark_failed($1,$2)', [row.rows[0].id, 'Fallo de prueba']), 'service_role');
      const failed = await db.query('select status,last_error from public.email_outbox where id=$1', [row.rows[0].id]);
      assert.equal(failed.rows[0].status, 'failed');
      const alert = await db.query("select kind,recipient,body from public.email_outbox where kind='admin_alert'");
      assert.equal(alert.rows.length, 2);
      assert.match(alert.rows[0].body, /Fallo de prueba/);
    });

    await t.test('el webhook de rebote duro bloquea el correo y cancela pendientes', async () => {
      const row = await db.query("select id from public.email_outbox where kind='contact_receipt' limit 1");
      await db.query("update public.email_outbox set status='sent', provider_message_id='provider-1' where id=$1", [row.rows[0].id]);
      const result = await as(null, () => db.query('select public.email_webhook_event($1) as id',
        [{ event: 'hardBounce', email: 'persona@example.test', 'message-id': 'provider-1', reason: 'mailbox unavailable' }]), 'service_role');
      assert.equal(result.rows[0].id, row.rows[0].id);
      assert.equal((await db.query('select status from public.email_outbox where id=$1', [row.rows[0].id])).rows[0].status, 'bounced');
      assert.equal((await db.query("select count(*)::int n from public.email_optouts where email='persona@example.test'")).rows[0].n, 1);
      const events = await db.query("select action from public.email_events where outbox_id=$1 order by id", [row.rows[0].id]);
      assert.equal(events.rows.at(-1).action, 'bounce');
    });

    await t.test('solo administración responde; el hilo y la cola conservan la respuesta', async () => {
      await assert.rejects(as(student, () => db.query('select public.contact_reply($1,$2,$3,$4,$5)',
        [requestId, 1, 'Re: Consulta', 'Respuesta suficientemente larga.', replyKey])), /Administrator/);
      const result = await as(admin, () => db.query('select public.contact_reply($1,$2,$3,$4,$5) as data',
        [requestId, 1, 'Re: Consulta', 'Respuesta suficientemente larga.', replyKey]));
      assert.equal(result.rows[0].data.duplicate, false);
      assert.equal(result.rows[0].data.request.status, 'respondida');
      assert.equal(result.rows[0].data.request.version, 2);
      const thread = await as(admin, () => db.query('select direction,body from public.contact_thread($1)', [requestId]));
      assert.deepEqual(thread.rows.map((row) => row.direction), ['inbound', 'outbound']);
      assert.match(thread.rows[1].body, /Respuesta suficientemente larga/);
      const outbox = await db.query("select kind,subject,body,reply_to from public.email_outbox where kind='contact_reply'");
      assert.equal(outbox.rows.length, 1);
      assert.equal(outbox.rows[0].subject, 'Re: Consulta');
      assert.match(outbox.rows[0].body, /Respuesta suficientemente larga/);
      const repeated = await as(admin, () => db.query('select public.contact_reply($1,$2,$3,$4,$5) as data',
        [requestId, 1, 'Re: Consulta', 'Respuesta suficientemente larga.', replyKey]));
      assert.equal(repeated.rows[0].data.duplicate, true);
      assert.equal((await db.query("select count(*)::int n from public.contact_messages")).rows[0].n, 1);
    });

    await t.test('la comunidad no lee el hilo ni la tabla de mensajes', async () => {
      await assert.rejects(as(student, () => db.query('select * from public.contact_thread($1)', [requestId])), /Administrator/);
      assert.equal((await as(student, () => db.query('select * from public.contact_messages'))).rows.length, 0);
      await assert.rejects(as(null, () => db.query('select * from public.email_webhook_event($1)', [{ event: 'delivered' }]), 'anon'), /permission denied/);
    });
  } finally { await db.close(); }
});
