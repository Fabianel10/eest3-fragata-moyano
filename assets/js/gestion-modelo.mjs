export const POST_COLUMNS = 'id,kind,title,body,career,audience,attachment_url,attachment_label,published_at,expires_at,updated_at,version';
export const POST_KINDS = { comunicado: 'Comunicado', documento: 'Documento', proyecto: 'Proyecto estudiantil', horario: 'Horarios y equipo docente' };
export const CAREERS = { '': 'Todas las carreras', informatica: 'Informática', madera: 'Madera y Mueble', obras: 'Maestro Mayor de Obras' };
export const CONTACT_STATES = { nueva: 'Nueva', revision: 'En revisión', respondida: 'Respondida', cerrada: 'Cerrada' };
export function searchPattern(value) {
  return `%${value.replace(/[\\%_]/g, (character) => `\\${character}`).trim()}%`;
}
export function validatePost(value) {
  if (!Object.hasOwn(POST_KINDS, value.kind) || !Object.hasOwn(CAREERS, value.career) ||
      !['comunidad', 'alumnos', 'familias', 'docentes'].includes(value.audience) ||
      typeof value.title !== 'string' || value.title.trim().length < 3 || value.title.length > 200 ||
      typeof value.body !== 'string' || value.body.trim().length < 10 || value.body.length > 20000) {
    throw new Error('Revisá tipo, título, contenido, carrera y destinatarios.');
  }
  if (value.attachment_url) {
    const url = new URL(value.attachment_url);
    if (url.protocol !== 'https:' || url.username || url.password || /[\s<>]/.test(value.attachment_url) ||
        value.attachment_url.length > 2048 || !value.attachment_label.trim()) {
      throw new Error('Usá un enlace HTTPS sin credenciales e indicá su nombre.');
    }
  }
  if (value.attachment_label.length > 200) throw new Error('El nombre del enlace es demasiado largo.');
  for (const key of ['published_at', 'expires_at']) {
    if (value[key] && !Number.isFinite(Date.parse(value[key]))) throw new Error('Fecha inválida.');
  }
  if (value.expires_at && value.published_at && Date.parse(value.expires_at) <= Date.parse(value.published_at)) {
    throw new Error('El vencimiento debe ser posterior a la publicación.');
  }
  return value;
}
export function safeAttachment(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !/[\s<>]/.test(value);
  } catch { return false; }
}
