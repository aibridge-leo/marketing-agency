require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const chatHandler = require('./api/chat');

const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.md':   'text/markdown; charset=utf-8',
  '.json': 'application/json',
};

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/api/chat') {
    return chatHandler(req, res);
  }

  const filePath = path.join(__dirname, url === '/' ? 'index.html' : url);

  // Prevent path traversal
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.statusCode = 200;
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 JYS마케팅 서버 실행 중`);
  console.log(`   http://localhost:${PORT}\n`);
});
