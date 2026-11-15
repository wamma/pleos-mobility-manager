import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const files = new Map([
  ['/', 'index.html'], ['/index.html', 'index.html'], ['/styles.css', 'styles.css'],
  ...['app', 'mobility', 'camping', 'troubleshooter', 'format'].map(n => [`/src/${n}.js`, `src/${n}.js`]),
]);
const types = { html: 'text/html', css: 'text/css', js: 'text/javascript' };
const server = http.createServer(async (req, res) => {
  const file = files.get(new URL(req.url, 'http://localhost').pathname);
  if (!file || !['GET','HEAD'].includes(req.method)) { res.writeHead(404); return res.end('Not found'); }
  try {
    const data = await readFile(fileURLToPath(new URL(file, import.meta.url)));
    res.writeHead(200, { 'Content-Type': `${types[file.split('.').pop()]}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(500); res.end('Read failed'); }
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`Pleos demo: http://127.0.0.1:${server.address().port}`));
