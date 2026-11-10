import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const admin = '00000000-0000-4000-8000-000000000001';
const student = '00000000-0000-4000-8000-000000000002';
const requestId = '00000000-0000-4000-8000-000000000010';
const replyKey = '00000000-0000-4000-8000-000000000020';

test('operativas: códigos de recuperación, plantillas, adjuntos y estado del servicio', async (t) => {
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
    '202611100014_seguridad_sesiones.sql', '202611100015_webhook_eventos.sql',
    '202611100016_mejoras_operativas.sql'];
  for (const file of files) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  for (const id of [admin, student]) {
    await db.query('insert into auth.users values($1,$2,$3)', [id, `${id.slice(-4)}@example.test`, {
      full_name: 'Persona de prueba', requested_role: 'comunidad',
      email_notifications: false, privacy_version: '2026-10-06'
    }]);
  }
  await db.query("update public.profiles set role='administrador' where id=$1", [admin]);
  await db.query("insert into auth.mfa_factors values('00000000-0000-4000-8000-000000000099',$1,'totp','verified')", [admin]);
  async function as(uid, action, role = 'authenticated', aal = 'aal2') {
    await db.exec('begin');
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid || '']);
      await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: uid || null, aal, session_id: '00000000-0000-4000-8000-000000000001' })]);
      await db.exec(`set local role ${role}`);
      const result = await action();
      await db.exec('commit');
      return result;
    } catch (error) { await db.exec('rollback'); throw error; }
  }
  const payload = { nombre: 'Persona consultante', correo: 'persona@example.test', asunto: 'Consulta con adjunto',
    mensaje: 'Mensaje de prueba con longitud suficiente.', categoria: 'general', carrera: '', privacidad: 'aceptada' };
  try {
    await t.test('genera códigos de recuperación y los invalida al usarlos', async () => {
      const codes = (await as(admin, () => db.query('select public.mfa_recovery_generate() as codes'))).rows[0].codes;
      assert.equal(codes.length, 8);
      assert.equal((await db.query('select count(*)::int n from public.mfa_recovery_codes')).rows[0].n, 8);
      assert.equal((await db.query("select count(*)::int n from public.mfa_recovery_codes where code_hash = $1", [codes[0]])).rows[0].n, 0);
      assert.equal((await as(admin, () => db.query('select public.mfa_recovery_use($1) as ok', [codes[0]]))).rows[0].ok, true);
      assert.equal((await db.query('select count(*)::int n from auth.mfa_factors where user_id=$1', [admin])).rows[0].n, 0);
      await assert.rejects(as(admin, () => db.query('select public.mfa_recovery_use($1)', [codes[0]])), /inválido/);
    });

    await t.test('administración gestiona plantillas; la comunidad no accede', async () => {
      const template = await as(admin, () => db.query("insert into public.contact_reply_templates(title,body,created_by) values('Consulta general','Gracias por comunicarte con la escuela.', $1) returning id,title", [admin]));
      assert.equal(template.rows[0].title, 'Consulta general');
      assert.equal((await as(admin, () => db.query('select * from public.contact_reply_templates'))).rows.length, 1);
      assert.equal((await as(student, () => db.query('select * from public.contact_reply_templates'))).rows.length, 0);
      await assert.rejects(as(student, () => db.query("insert into public.contact_reply_templates(title,body) values('X','Contenido suficiente.')")), /row-level security/);
    });

    await t.test('respuesta con adjunto queda en hilo y en la cola', async () => {
      await as(null, () => db.query('select public.contact_submit($1,$2,$3)', [requestId, payload, 'a'.repeat(64)]), 'service_role');
      const response = await as(admin, () => db.query(
        'select public.contact_reply($1,$2,$3,$4,$5,$6,$7) as data',
        [requestId, 1, 'Re: Consulta', 'Respuesta con documentación adjunta.', replyKey,
          'https://eest3sf.netlify.app/privacidad.html', 'Política de privacidad']));
      assert.equal(response.rows[0].data.duplicate, false);
      const thread = await as(admin, () => db.query('select attachment_url,attachment_label from public.contact_thread($1)', [requestId]));
      assert.equal(thread.rows[1].attachment_url, 'https://eest3sf.netlify.app/privacidad.html');
      assert.equal(thread.rows[1].attachment_label, 'Política de privacidad');
      const outbox = await db.query("select body,html_body from public.email_outbox where kind='contact_reply'");
      assert.match(outbox.rows[0].body, /Política de privacidad/);
      assert.match(outbox.rows[0].html_body, /Respuesta con documentación adjunta/);
      await assert.rejects(as(admin, () => db.query('select public.contact_reply($1,$2,$3,$4,$5,$6,$7)',
        [requestId, 2, 'Re: Otra', 'Respuesta con enlace inválido.', '00000000-0000-4000-8000-000000000021',
          'http://inseguro.test', 'Enlace'])), /Invalid attachment/);
    });

    await t.test('estado del servicio disponible para el equipo y restringido a la comunidad', async () => {
      const health = await as(admin, () => db.query('select public.system_health() as data'));
      assert.ok(Number(health.rows[0].data.queue_pending) >= 0);
      assert.equal(health.rows[0].data.contacts_total, 1);
      assert.equal(health.rows[0].data.calendar_published, 0);
      await assert.rejects(as(student, () => db.query('select public.system_health()')), /team permission/);
    });
  } finally { await db.close(); }
});
