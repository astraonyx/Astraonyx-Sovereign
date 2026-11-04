const http = require('http');
const { app } = require('../server');

const testServer = http.createServer(app);

async function runTests() {
  await new Promise((resolve) => testServer.listen(0, '127.0.0.1', resolve));
  const port = testServer.address().port;
  console.log(`Test server running on port ${port}`);

  const endpoints = [
    { path: '/', expected: [200, 304] },
    { path: '/login', expected: [200, 304] },
    { path: '/welcome', expected: [200, 304] },
    { path: '/js/app.js', expected: [200, 304] },
    { path: '/js/kinetix-engine.js', expected: [200, 304] },
    { path: '/js/polaris-motion.js', expected: [200, 304] },
    { path: '/js/auth.js', expected: [200, 304] },
    { path: '/css/tokens.css', expected: [200, 304] },
    { path: '/css/polaris.css', expected: [200, 304] },
    { path: '/vendor/three.module.js', expected: [200, 304] },
    { path: '/vendor/three.core.js', expected: [200, 304] },
    { path: '/api/bot/status', expected: [200, 401, 403] },
    { path: '/api/auth/me', expected: [200, 401] },
    { path: '/api/atomic/habits', expected: [200, 401] },
    { path: '/api/atomic/todos', expected: [200, 401] },
    { path: '/api/analytics/summary', expected: [200, 401] },
    { path: '/api/sirium/listings', expected: [200, 401] }
  ];

  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port,
          path: ep.path,
          method: 'GET'
        }, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.end();
      });

      if (ep.expected.includes(res.status)) {
        console.log(`✓ [${res.status}] ${ep.path}`);
        passed++;
      } else {
        console.error(`❌ [${res.status}] ${ep.path} (expected ${ep.expected.join('/')}) - ${res.body.slice(0, 100)}`);
        failed++;
      }
    } catch (e) {
      console.error(`❌ ERROR ${ep.path}:`, e.message);
      failed++;
    }
  }

  testServer.close();
  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
