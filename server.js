const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const dataDir = path.join(root, 'data');
const photoDir = path.join(dataDir, 'photos');
const stateFile = path.join(dataDir, 'state.json');
fs.mkdirSync(photoDir, { recursive: true });
if (!fs.existsSync(stateFile)) fs.writeFileSync(stateFile, JSON.stringify({ records: [], masters: {} }, null, 2));

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}
function serveFile(res, requestPath) {
  const safe = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const file = path.resolve(root, safe);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Not found', 'text/plain');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
  send(res, 200, fs.readFileSync(file), types[path.extname(file).toLowerCase()] || 'application/octet-stream');
}
function savePhotos(records) {
  for (const record of records || []) {
    record.photos = (record.photos || []).map((photo, index) => {
      if (!String(photo).startsWith('data:image/')) return photo;
      const match = String(photo).match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/);
      if (!match) return photo;
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const name = `${record.id}-${index + 1}.${ext}`;
      fs.writeFileSync(path.join(photoDir, name), Buffer.from(match[2], 'base64'));
      return `/data/photos/${name}`;
    });
  }
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, fs.readFileSync(stateFile));
  if (req.method === 'POST' && url.pathname === '/api/state') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 60 * 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      try {
        const state = JSON.parse(body);
        savePhotos(state.records);
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
        send(res, 200, JSON.stringify(state));
      } catch (error) { send(res, 400, JSON.stringify({ error: error.message })); }
    });
    return;
  }
  if (req.method === 'GET') return serveFile(res, decodeURIComponent(url.pathname));
  send(res, 405, 'Method not allowed', 'text/plain');
}).listen(3000, () => console.log('Stampin Data is running at http://localhost:3000'));
