const path = require('node:path');
const assert = require('node:assert/strict');
const backend = file => path.resolve(__dirname, '..', file);
const mongoose = require(backend('node_modules/mongoose'));
const { app, startServer } = require(backend('app.js'));
let server;

// Start the actual backend against its configured database, then make GETs only.
// Normal startup initializes declared indexes; no test accounts/documents are made.
(async () => {
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    assert.equal(typeof app, 'function');
    console.log('PASS live backend startup and index initialization');
    const base = 'http://127.0.0.1:' + server.address().port;
    for (const [route, expected, field] of [
      ['/api/users', 200, 'users'],
      ['/api/places', 200, 'places'],
      ['/api/trips/active', 403],
      ['/api/nonexistent', 404]
    ]) {
      const response = await fetch(base + route, { signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, expected, route);
      const body = await response.json();
      if (field) assert.ok(Array.isArray(body[field]), route + ' list response');
      else assert.equal(typeof body.message, 'string');
      console.log('PASS live GET ' + route + ': HTTP ' + response.status);
    }
    console.log('Live checks: 5 passed; no account or document mutations performed.');
  } catch (error) {
    console.log('FAIL live backend check: ' + (error.code || error.name));
    process.exitCode = 1;
  } finally {
    if (server?.listening) await new Promise(resolve => {
      server.close(resolve);
      server.closeAllConnections();
    });
    await mongoose.disconnect();
  }
})();
