import { PAGINAS, validarDocumento } from './cms-modelo.mjs';

function requirePageSlug(slug) {
  if (!PAGINAS[slug]) throw new Error('El respaldo no corresponde a una página conocida.');
}

export function createCmsBackup(slug, document, options = {}) {
  requirePageSlug(slug);
  const content = structuredClone(document);
  validarDocumento(content);
  return {
    version: 1,
    slug,
    page: PAGINAS[slug],
    exported_at: options.exportedAt || new Date().toISOString(),
    document: content,
    server: {
      draft_version: Number.isInteger(options.draftVersion) ? options.draftVersion : 0,
      published_version: Number.isInteger(options.publishedVersion) ? options.publishedVersion : null
    }
  };
}

export function parseCmsBackup(raw) {
  const backup = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!backup || backup.version !== 1 || typeof backup.exported_at !== 'string') {
    throw new Error('El archivo no tiene el formato de respaldo esperado.');
  }
  requirePageSlug(backup.slug);
  validarDocumento(backup.document);
  return {
    version: 1,
    slug: backup.slug,
    page: PAGINAS[backup.slug],
    exported_at: backup.exported_at,
    document: structuredClone(backup.document),
    server: {
      draft_version: Number.isInteger(backup.server?.draft_version) ? backup.server.draft_version : 0,
      published_version: Number.isInteger(backup.server?.published_version) ? backup.server.published_version : null
    }
  };
}

export function backupFilename(slug, exportedAt = new Date().toISOString()) {
  requirePageSlug(slug);
  return `cms-${slug}-${exportedAt.replaceAll(':', '-').replace(/\.\d+Z$/, 'Z')}.json`;
}
