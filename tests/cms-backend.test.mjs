import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const catalogo = JSON.parse(await readFile(new URL('../assets/cms/catalogo.json', import.meta.url), 'utf8'));
test('backend editorial: autorización, publicación, conflictos, historial y Storage', async (t) => {
  const db = new PGlite();
  const admin = '00000000-0000-4000-8000-000000000001';
  const alumno = '00000000-0000-4000-8000-000000000002';
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key, bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `);
  for (const file of ['202610060001_comunidad.sql', '202610060002_editorial.sql', '202610060003_catalogo.sql', '202610060004_carreras.sql', '202610200005_gestion.sql', '202610200006_notificaciones.sql', '202610200007_skynet.sql']) {
    if (file === '202610060004_carreras.sql') {
      await db.query("insert into public.cms_pages(slug,draft,version) values ('historia',$1,3)",
        [JSON.stringify(catalogo.historia.defaults)]);
      const before = await db.query('select * from public.cms_templates order by slug');
      await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
      const after = await db.query("select * from public.cms_templates where slug in ('inicio','historia','galeria','calendario') order by slug");
      assert.deepEqual(after.rows, before.rows, 'La migración conserva los manifiestos desplegados');
      const draft = await db.query("select draft,version from public.cms_pages where slug='historia'");
      assert.deepEqual(draft.rows[0], { draft: catalogo.historia.defaults, version: 3 });
      await db.exec("delete from public.cms_pages where slug='historia'");
      continue;
    }
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  for (const id of [admin, alumno]) {
    await db.query('insert into auth.users values ($1,$2::jsonb)', [id, JSON.stringify({
      full_name: 'Persona prueba', requested_role: 'comunidad', email_notifications: false, privacy_version: '2026-10-06'
    })]);
  }
  await db.query("update public.profiles set role='administrador' where id=$1", [admin]);
  async function como(role, uid, action) {
    await db.exec('begin');
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid || '']);
      await db.exec(`set local role ${role}`);
      const result = await action();
      await db.exec('commit');
      return result;
    } catch (error) { await db.exec('rollback'); throw error; }
  }
  const save = (slug, doc, version, uid = admin) => como('authenticated', uid, () =>
    db.query('select public.cms_save_draft($1,$2::jsonb,$3) as page', [slug, JSON.stringify(doc), version]));
  const publish = (slug, version, uid = admin) => como('authenticated', uid, () =>
    db.query('select public.cms_publish($1,$2) as page', [slug, version]));
  try {
    await t.test('solo administración puede guardar; anónimos no leen borradores', async () => {
      await assert.rejects(save('inicio', catalogo.inicio.defaults, 0, alumno), /Administrator/);
      await assert.rejects(como('anon', null, () => db.query('select * from public.cms_pages')), /permission denied/);
      const result = await como('authenticated', alumno, () => db.query('select * from public.cms_pages'));
      assert.equal(result.rows.length, 0);
      await assert.rejects(como('authenticated', admin, () =>
        db.query("insert into public.cms_pages values ('inicio','{}',1,now(),$1)", [admin])), /permission denied/);
    });
    await t.test('todas las páginas se guardan como borradores sin exposición pública', async () => {
      for (const [slug, page] of Object.entries(catalogo)) {
        const result = await save(slug, page.defaults, 0);
        assert.equal(result.rows[0].page.version, 1);
      }
      const publicRows = await como('anon', null, () => db.query('select * from public.cms_published'));
      assert.equal(publicRows.rows.length, 0);
      const protectedRows = await como('authenticated', alumno, () => db.query('select * from public.cms_revisions'));
      assert.equal(protectedRows.rows.length, 0);
    });
    await t.test('servidor rechaza campos desconocidos, URL peligrosa y cambio de tipo', async () => {
      const unknown = structuredClone(catalogo.inicio.defaults);
      unknown.chrome.f99999 = { kind: 'text', value: 'No existe' };
      await assert.rejects(save('inicio', unknown, 1), /Unknown chrome/);
      const unsafe = structuredClone(catalogo.inicio.defaults);
      const link = Object.values(unsafe.chrome).find((f) => f.kind === 'link');
      link.value = 'javascript:alert(1)';
      await assert.rejects(save('inicio', unsafe, 1), /Invalid URL/);
      link.value = 'assets/%2e%2e/private';
      await assert.rejects(save('inicio', unsafe, 1), /Invalid URL/);
      link.value = 'javascript:alert(1)';
      link.kind = 'text';
      await assert.rejects(save('inicio', unsafe, 1), /Unknown chrome/);
      const custom = structuredClone(catalogo.inicio.defaults);
      custom.blocks.push({ id: 'test', kind: 'llamada', hidden: false, label: 'Test', source: '', theme: 'claro', layout: 'derecha',
        cards: [], fields: { link: { kind: 'text', value: 'javascript:alert(1)' } } });
      await assert.rejects(save('inicio', custom, 1), /custom field/);
    });
    await t.test('servidor valida fechas, duplicados y límites de contenido', async () => {
      const invalid = structuredClone(catalogo.inicio.defaults);
      invalid.modules.events[0].date = '2026-02-31';
      await assert.rejects(save('inicio', invalid, 1), /out of range/);
      invalid.modules.events = [catalogo.inicio.defaults.modules.events[0], catalogo.inicio.defaults.modules.events[0]];
      await assert.rejects(save('inicio', invalid, 1), /Invalid event/);
      const oversized = structuredClone(catalogo.inicio.defaults);
      oversized.blocks = Array.from({ length: 61 }, () => oversized.blocks[0]);
      await assert.rejects(save('inicio', oversized, 1), /block count/);
      await assert.rejects(save('inventada', catalogo.inicio.defaults, 0), /Invalid page/);
    });
    await t.test('versionado detecta ediciones concurrentes sin perder el borrador', async () => {
      const doc = structuredClone(catalogo.inicio.defaults);
      doc.title = 'Título editado';
      const updated = await save('inicio', doc, 1);
      assert.equal(updated.rows[0].page.version, 2);
      await assert.rejects(save('inicio', catalogo.inicio.defaults, 1), /version conflict/);
      await assert.rejects(save('inicio', catalogo.inicio.defaults, 0), /version conflict/);
      const result = await db.query("select draft->>'title' as title, version from public.cms_pages where slug='inicio'");
      assert.equal(result.rows[0].title, 'Título editado');
      assert.equal(result.rows[0].version, 2);
    });
    await t.test('las tres carreras publican con permisos y detectan conflictos independientemente', async () => {
      for (const slug of ['informatica', 'madera', 'obras']) {
        await assert.rejects(publish(slug, 1, alumno), /Administrator/);
        await publish(slug, 1);
        await assert.rejects(save(slug, catalogo[slug].defaults, 1), /version conflict/);
        const result = await como('anon', null, () =>
          db.query('select content from public.cms_published where slug=$1', [slug]));
        assert.deepEqual(result.rows[0].content, catalogo[slug].defaults);
      }
    });
    await t.test('publicación expone solo la instantánea y exige versión actual', async () => {
      await assert.rejects(publish('inicio', 2, alumno), /Administrator/);
      await assert.rejects(publish('inicio', 1), /version conflict/);
      const result = await publish('inicio', 2);
      assert.equal(result.rows[0].page.version, 3);
      const rows = await como('anon', null, () => db.query("select content from public.cms_published where slug='inicio'"));
      assert.equal(rows.rows[0].content.title, 'Título editado');
      const next = structuredClone(catalogo.inicio.defaults);
      next.title = 'Borrador no público';
      await save('inicio', next, 3);
      const published = await como('anon', null, () => db.query("select content->>'title' as title from public.cms_published where slug='inicio'"));
      assert.equal(published.rows[0].title, 'Título editado');
    });
    await t.test('restauración conserva historial y no modifica la publicación', async () => {
      const first = await db.query("select id from public.cms_revisions where slug='inicio' order by id limit 1");
      const result = await como('authenticated', admin, () => db.query(
        "select public.cms_restore('inicio',$1,4) as page", [first.rows[0].id]));
      assert.equal(result.rows[0].page.version, 5);
      assert.equal(result.rows[0].page.draft.title, catalogo.inicio.defaults.title);
      const published = await db.query("select content->>'title' as title from public.cms_published where slug='inicio'");
      assert.equal(published.rows[0].title, 'Título editado');
      const actions = await db.query("select action from public.cms_revisions where slug='inicio' order by id");
      assert.deepEqual(actions.rows.map((r) => r.action), ['save', 'save', 'publish', 'save', 'restore']);
      await assert.rejects(como('authenticated', admin, () =>
        db.query("select public.cms_restore('historia',$1,1)", [first.rows[0].id])), /not found/);
    });
    await t.test('Storage solo admite altas autorizadas; los medios son inmutables', async () => {
      const id = '00000000-0000-4000-8000-000000000010';
      const path = `${id}.png`;
      await assert.rejects(como('authenticated', alumno, () => db.query(
        "insert into storage.objects values($1,'institutional-media',$2)", [id, path])), /row-level/);
      await assert.rejects(como('anon', null, () => db.query(
        "insert into storage.objects values($1,'institutional-media',$2)", [id, path])), /row-level/);
      await assert.rejects(como('authenticated', admin, () => db.query(
        "insert into storage.objects values($1,'institutional-media','bad.svg')", [id])), /row-level/);
      await como('authenticated', admin, () => db.query(
        "insert into storage.objects values($1,'institutional-media',$2)", [id, path]));
      const noDelete = await como('authenticated', admin, () => db.query('delete from storage.objects returning id'));
      assert.equal(noDelete.rows.length, 0);
      const noUpdate = await como('authenticated', admin, () => db.query("update storage.objects set name='replaced.png' returning id"));
      assert.equal(noUpdate.rows.length, 0);
      const bucket = await db.query('select * from storage.buckets');
      assert.equal(Number(bucket.rows[0].file_size_limit), 20971520);
      assert.equal(bucket.rows[0].allowed_mime_types.includes('image/svg+xml'), false);
    });
    await t.test('biblioteca privada para admins, metadatos editables y archivo sin borrado', async () => {
      const id = '00000000-0000-4000-8000-000000000010';
      await assert.rejects(como('authenticated', alumno, () => db.query(
        'insert into public.cms_media(id,path,mime_type,size_bytes,title) values($1,$2,$3,100,$4)',
        [id, `${id}.png`, 'image/png', 'Prueba'])), /row-level/);
      await como('authenticated', admin, () => db.query(
        'insert into public.cms_media(id,path,mime_type,size_bytes,title) values($1,$2,$3,100,$4)',
        [id, `${id}.png`, 'image/png', 'Prueba']));
      const own = await como('authenticated', alumno, () => db.query('select * from public.cms_media'));
      assert.equal(own.rows.length, 0);
      await como('authenticated', admin, () => db.query('update public.cms_media set archived=true where id=$1', [id]));
      await assert.rejects(como('authenticated', admin, () => db.query("update public.cms_media set path='replacement.png'")), /permission denied/);
      await assert.rejects(como('authenticated', admin, () => db.query('delete from public.cms_media')), /permission denied/);
    });
  } finally { await db.close(); }
});
