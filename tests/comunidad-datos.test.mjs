import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('migración, autorización y consentimiento en PostgreSQL', async (t) => {
  const db = new PGlite();
  const ids = {
    alumno: '00000000-0000-4000-8000-000000000001',
    profesor: '00000000-0000-4000-8000-000000000002',
    admin: '00000000-0000-4000-8000-000000000003',
    invalido: '00000000-0000-4000-8000-000000000004'
  };
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb not null);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/202610060001_comunidad.sql', import.meta.url), 'utf8'));
  const crear = (id, perfil, extra = {}) => db.query(
    'insert into auth.users values ($1, $2::jsonb)',
    [id, JSON.stringify({
      full_name: 'Persona de prueba', requested_role: perfil, email_notifications: false,
      privacy_version: '2026-10-06', ...extra
    })]
  );
  async function como(rol, id, accion) {
    await db.exec('begin');
    try {
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id || '']);
      await db.exec(`set local role ${rol}`);
      const resultado = await accion();
      await db.exec('commit');
      return resultado;
    } catch (error) {
      await db.exec('rollback');
      throw error;
    }
  }
  try {
    await crear(ids.alumno, 'alumno', { role: 'administrador' });
    await crear(ids.profesor, 'profesor');
    await crear(ids.admin, 'comunidad');
    await db.query("update public.profiles set role = 'administrador' where id = $1", [ids.admin]);

    await t.test('alta no permite administración y exige consentimiento/version válidos', async () => {
      const { rows } = await db.query('select * from public.profiles where id = $1', [ids.alumno]);
      assert.equal(rows[0].role, 'comunidad');
      assert.equal(rows[0].requested_role, 'alumno');
      assert.equal(rows[0].notification_consent_at, null);
      await assert.rejects(crear(ids.invalido, 'administrador'), /Invalid public profile/);
      await assert.rejects(crear(ids.invalido, 'comunidad', { privacy_version: '' }), /privacy/);
      await assert.rejects(crear(ids.invalido, 'comunidad', { email_notifications: 'true' }), /preference/);
      await assert.rejects(crear(ids.invalido, 'comunidad', { full_name: ' ' }), /full name/);
    });
    await t.test('anónimo no puede consultar perfiles ni aprobar', async () => {
      await assert.rejects(como('anon', null, () => db.query('select * from public.profiles')), /permission denied/);
      await assert.rejects(como('anon', null, () => db.query('select public.approve_profile($1)', [ids.alumno])), /permission denied/);
    });
    await t.test('cuenta común solo lee su fila y no puede elevar permisos', async () => {
      const { rows } = await como('authenticated', ids.alumno, () => db.query('select * from public.profiles'));
      assert.equal(rows.length, 1);
      assert.equal(rows[0].id, ids.alumno);
      await assert.rejects(como('authenticated', ids.alumno, () =>
        db.query("update public.profiles set role = 'administrador' where id = $1", [ids.alumno])), /permission denied/);
      await assert.rejects(como('authenticated', ids.alumno, () =>
        db.query("update public.profiles set requested_role = 'profesor'")), /permission denied/);
      await assert.rejects(como('authenticated', ids.alumno, () =>
        db.query('delete from public.profiles')), /permission denied/);
      const resultado = await como('authenticated', ids.alumno, () =>
        db.query("update public.profiles set full_name = 'Nombre ajeno' where id = $1 returning id", [ids.profesor]));
      assert.equal(resultado.rows.length, 0);
      await assert.rejects(como('authenticated', ids.alumno, () =>
        db.query('select public.approve_profile($1)', [ids.alumno])), /Administrator permission/);
    });
    await t.test('preferencias válidas persisten y el servidor fecha altas y bajas', async () => {
      const alta = await como('authenticated', ids.alumno, () => db.query(
        "update public.profiles set email_notifications = true, topics = array['calendario'], full_name = ' Nombre válido ' where id = $1 returning *",
        [ids.alumno]
      ));
      assert.equal(alta.rows[0].full_name, 'Nombre válido');
      assert.ok(alta.rows[0].notification_consent_at);
      assert.deepEqual(alta.rows[0].topics, ['calendario']);
      const baja = await como('authenticated', ids.alumno, () => db.query(
        'update public.profiles set email_notifications = false where id = $1 returning *', [ids.alumno]
      ));
      assert.ok(baja.rows[0].notification_revoked_at);
      assert.ok(baja.rows[0].notification_consent_at);
      await assert.rejects(como('authenticated', ids.alumno, () => db.query(
        "update public.profiles set topics = array['secreto'] where id = $1", [ids.alumno]
      )), /check constraint/);
      await assert.rejects(como('authenticated', ids.alumno, () => db.query(
        'update public.profiles set notification_consent_at = now() where id = $1', [ids.alumno]
      )), /permission denied/);
    });
    await t.test('administración puede leer/aprobar pero no otorgar administración por API', async () => {
      const { rows } = await como('authenticated', ids.admin, () => db.query('select * from public.profiles'));
      assert.equal(rows.length, 3);
      await como('authenticated', ids.admin, () => db.query('select public.approve_profile($1)', [ids.profesor]));
      const perfil = await db.query('select role from public.profiles where id = $1', [ids.profesor]);
      assert.equal(perfil.rows[0].role, 'profesor');
      await assert.rejects(como('authenticated', ids.admin, () =>
        db.query('select public.approve_profile($1)', [ids.profesor])), /No pending/);
      await assert.rejects(como('authenticated', ids.admin, () =>
        db.query("update public.profiles set role = 'administrador' where id = $1", [ids.alumno])), /permission denied/);
    });
    await t.test('metadatos editados no cambian el perfil y borrar Auth elimina la fila', async () => {
      await db.query(`update auth.users set raw_user_meta_data = '{"role":"administrador"}' where id = $1`, [ids.alumno]);
      const { rows } = await db.query('select role from public.profiles where id = $1', [ids.alumno]);
      assert.equal(rows[0].role, 'comunidad');
      await db.query('delete from auth.users where id = $1', [ids.alumno]);
      const restantes = await db.query('select * from public.profiles where id = $1', [ids.alumno]);
      assert.equal(restantes.rows.length, 0);
    });
  } finally {
    await db.close();
  }
});
