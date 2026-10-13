// SDK simulado exclusivamente para pruebas de navegador; nunca se carga desde el sitio.
export function createClient() {
  const key = 'cms-test-data';
  const read = () => JSON.parse(sessionStorage.getItem(key) || '{"pages":{},"published":{},"history":[],"media":[]}');
  const write = (data) => sessionStorage.setItem(key, JSON.stringify(data));
  window.__cmsTest = { read, reset: () => sessionStorage.removeItem(key) };
  const user = { id: '00000000-0000-4000-8000-000000000001', email: 'admin@example.test' };
  const ok = (data) => ({ data, error: null });
  const fail = (code) => ({ data: null, error: { code } });
  function rows(table) {
    const data = read();
    if (table === 'profiles') return [{ role: sessionStorage.getItem('cms-test-role') || 'administrador', full_name: 'Administración Prueba', id: user.id }];
    if (table === 'cms_pages') return Object.values(data.pages);
    if (table === 'cms_published') return Object.entries(data.published).map(([slug, row]) => ({ slug, ...row }));
    if (table === 'cms_revisions') return data.history;
    if (table === 'cms_media') return data.media;
    return [];
  }
  return {
    auth: {
      async getUser() { return ok({ user }); },
      onAuthStateChange() { return {}; }
    },
    from(table) {
      const filters = [];
      let orderKey; let descending = false; let start = 0; let end = Infinity;
      let change; let inserting;
      function execute() {
        let result = rows(table).filter((row) => filters.every(([key, value]) => row[key] === value));
        if (orderKey) result.sort((a, b) => {
          const direction = a[orderKey] < b[orderKey] ? -1 : a[orderKey] > b[orderKey] ? 1 : 0;
          return descending ? -direction : direction;
        });
        result = result.slice(start, end + 1);
        if (inserting) {
          const data = read(); data.media.push({ ...inserting, archived: false, created_at: new Date().toISOString() }); write(data);
          result = [];
        }
        if (change) {
          const data = read();
          data.media = data.media.map((row) => result.some((r) => r.id === row.id) ? { ...row, ...change } : row);
          write(data);
        }
        return ok(result);
      }
      const builder = {
        select() { return builder; },
        eq(key, value) { filters.push([key, value]); return builder; },
        order(key, options) { orderKey = key; descending = options.ascending === false; return builder; },
        range(first, last) { start = first; end = last; return builder; },
        insert(data) { inserting = data; return builder; },
        update(data) { change = data; return builder; },
        async maybeSingle() { return ok(execute().data[0] || null); },
        async single() { const result = execute().data[0]; return result ? ok(result) : fail('PGRST116'); },
        then(resolve) { resolve(execute()); }
      };
      return builder;
    },
    async rpc(name, args) {
      const data = read();
      const current = data.pages[args.page_slug];
      if ((current?.version || 0) !== args.expected_version) return fail('40001');
      let page;
      if (name === 'cms_save_draft') {
        page = { slug: args.page_slug, draft: structuredClone(args.document), version: (current?.version || 0) + 1 };
      } else if (name === 'cms_publish') {
        page = { ...current, version: current.version + 1 };
        data.published[args.page_slug] = { content: page.draft, version: page.version, published_at: new Date().toISOString() };
      } else {
        const row = data.history.find((r) => r.id === args.revision_id);
        page = { ...current, draft: structuredClone(row.content), version: current.version + 1 };
      }
      data.pages[args.page_slug] = page;
      data.history.push({
        id: data.history.length + 1, slug: page.slug, content: structuredClone(page.draft), version: page.version,
        action: name === 'cms_publish' ? 'publish' : name === 'cms_restore' ? 'restore' : 'save',
        created_at: new Date().toISOString(), created_by: user.id
      });
      write(data);
      return ok(page);
    },
    storage: {
      from() {
        return {
          async upload(path) { return ok({ path }); },
          getPublicUrl(path) { return { data: { publicUrl: `https://portal-test.supabase.co/storage/v1/object/public/institutional-media/${path}` } }; }
        };
      }
    }
  };
}
