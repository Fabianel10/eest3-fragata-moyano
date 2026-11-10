import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.mp4': 'video/mp4',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.ico': 'image/x-icon'
};
const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('El servidor local solo sirve archivos; usá producción para enviar formularios.');
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(`${root}${sep}`) || pathname.split('/').some((part) => part.startsWith('.'))) {
      response.writeHead(403).end('Acceso denegado');
      return;
    }
    let body;
    try {
      body = await readFile(path);
    } catch (error) {
      if (!['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code)) throw error;
      // Paridad con Netlify: los archivos de public/ se publican en la raíz.
      body = await readFile(resolve(root, 'public', `.${pathname}`));
    }
    response.writeHead(200, {
      'Content-Type': types[extname(path)] || 'application/octet-stream',
      'Content-Length': body.length
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const status = error instanceof URIError ? 400 : ['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code) ? 404 : 500;
    if (status === 500) console.error('Error del servidor local:', error.code || error.name);
    response.writeHead(status).end('No se pudo abrir el recurso');
  }
});
server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE'
    ? 'El puerto 4173 ya está ocupado. Revisá http://localhost:4173 antes de iniciar otra instancia.'
    : `No se pudo iniciar el servidor local: ${error.code || error.message}`);
  process.exitCode = 1;
});
server.listen(4173, '127.0.0.1', () => console.log('Sitio disponible en http://localhost:4173'));
