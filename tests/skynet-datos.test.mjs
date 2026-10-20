import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('Skynet: consentimiento, nombre, privacidad entre cuentas, límites y borrado', async t => {
  const db = new PGlite();
  const owner = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/202610200007_skynet.sql', import.meta.url), 'utf8'));
  await db.query('insert into auth.users values($1),($2)', [owner, other]);
  async function as(uid, work, role = 'authenticated') {
    await db.exec('begin');
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid || '']);
      await db.exec(`set local role ${role}`);
      const result = await work(); await db.exec('commit'); return result;
    } catch (error) { await db.exec('rollback'); throw error; }
  }
  const consent = (enabled, uid = owner, version = '2026-10-20-skynet') =>
    as(uid, () => db.query('select public.skynet_consent($1,$2)', [enabled, version]));
  let counter = 0;
  const data = () => ({ id: `00000000-0000-4000-8000-${String(++counter).padStart(12,'0')}`,
    question: '¿Qué carreras hay?', answer: { id: 'carreras', text: 'Tres carreras técnicas.', links: [['informatica.html', 'Informática']] } });
  const append = (turn, uid = owner) => as(uid, () => db.query('select public.skynet_history_append($1,$2,$3) as id',
    [turn.id, turn.question, turn.answer]));
  const list = (uid = owner, before = null) => as(uid, () => db.query('select * from public.skynet_history_list($1)', [before]));
  const name = (value, uid = owner) => as(uid, () => db.query('select public.skynet_name_set($1)', [value]));
  try {
    await t.test('sin consentimiento no escribe; anónimos no acceden ni pueden suplantar propietario', async () => {
      await assert.rejects(append(data()), /consent/);
      await assert.rejects(consent(true, owner, 'invalid'), /consent/);
      await assert.rejects(consent(null), /consent/);
      await assert.rejects(as(null, () => db.query('select * from public.skynet_history_list(null)'), 'anon'), /permission denied/);
      await assert.rejects(as(null, () => db.query('select public.skynet_consent(true,$1)', ['2026-10-20-skynet'])), /Authentication/);
      await consent(true);
      await assert.rejects(as(owner, () => db.query('insert into public.skynet_preferences(user_id,enabled,privacy_version) values($1,true,$2)', [other, '2026-10-20-skynet'])), /permission denied/);
    });
    await t.test('reintento exacto idempotente, conflicto y datos inválidos rechazados', async () => {
      const turn = data();
      const first = (await append(turn)).rows[0].id;
      assert.equal((await append(turn)).rows[0].id, first);
      await assert.rejects(append({ ...turn, question: 'Otra consulta' }), /conflict/);
      for (const answer of [null, [], {}, { ...turn.answer, links: [['javascript:alert(1)', 'Mal']] },
        { ...turn.answer, links: [['https://external.invalid', 'Mal']] },
        { ...turn.answer, text: 'a'.repeat(4001) }, { ...turn.answer, extra: 'unexpected' },
        { ...turn.answer, links: [null] }]) {
        await assert.rejects(append({ ...data(), answer }), /Invalid|Unknown/);
      }
      await assert.rejects(append({ ...data(), question: '' }), /Invalid/);
    });
    await t.test('historial y nombre son privados incluso frente a otra cuenta autenticada', async () => {
      assert.equal((await list()).rows.length, 1);
      assert.equal((await list(other)).rows.length, 0);
      assert.equal((await as(other, () => db.query('select * from public.skynet_turns'))).rows.length, 0);
      assert.equal((await as(other, () => db.query('select * from public.skynet_preferences'))).rows.length, 0);
      await assert.rejects(as(owner, () => db.query('update public.skynet_turns set question=$1', ['Falso'])), /permission denied/);
      await name('María');
      assert.equal((await as(owner, () => db.query('select display_name from public.skynet_preferences'))).rows[0].display_name, 'María');
      await assert.rejects(name('<script>'), /Invalid nickname/);
      await assert.rejects(name('--'), /Invalid nickname/);
      await name(null);
      assert.equal((await as(owner, () => db.query('select display_name from public.skynet_preferences'))).rows[0].display_name, null);
    });
    await t.test('máximo exacto de 100 turnos, páginas de 30 sin repeticiones y caducidad de 90 días', async () => {
      for (let i = 0; i < 102; i++) await append(data());
      assert.equal((await db.query('select count(*)::int as total from public.skynet_turns')).rows[0].total, 100);
      const first = (await list()).rows;
      const second = (await list(owner, first.at(-1).id)).rows;
      assert.equal(first.length, 30); assert.equal(second.length, 30);
      assert.ok(!first.some(a => second.some(b => a.id === b.id)));
      await db.query("update public.skynet_turns set created_at=now()-interval '91 days' where id=$1", [first[0].id]);
      assert.equal((await as(owner, () => db.query('select count(*)::int as total from public.skynet_turns'))).rows[0].total, 99);
      await list();
      assert.equal((await db.query('select count(*)::int as total from public.skynet_turns')).rows[0].total, 99);
    });
    await t.test('borrado solo propio, revocación elimina chats y no confunde consentimiento con nombre', async () => {
      await consent(true, other);
      await append(data(), other);
      await name('Fabi');
      await consent(false);
      assert.equal((await list()).rows.length, 0);
      assert.equal((await list(other)).rows.length, 1);
      await assert.rejects(append(data()), /consent/);
      assert.equal((await as(owner, () => db.query('select display_name from public.skynet_preferences'))).rows[0].display_name, 'Fabi');
      await as(other, () => db.query('select public.skynet_history_clear()'));
      assert.equal((await list(other)).rows.length, 0);
      await db.query('delete from auth.users where id=$1', [owner]);
      assert.equal((await db.query('select * from public.skynet_preferences where user_id=$1', [owner])).rows.length, 0);
    });
  } finally { await db.close(); }
});
