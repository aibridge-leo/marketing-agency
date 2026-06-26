function parseBody(req) {
  if (req.body !== undefined) {
    return Promise.resolve(
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    );
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

module.exports = { parseBody };
