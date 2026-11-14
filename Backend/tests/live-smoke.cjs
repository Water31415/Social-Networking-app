const path = require('node:path');
const assert = require('node:assert/strict');
const backend = file => path.resolve(__dirname, '..', file);
const mongoose = require(backend('node_modules/mongoose'));
const { app, startServer } = require(backend('app.js'));
let server;
const checkRunningServer = process.argv.includes('--running');
let passed = 0;

// --running checks the process the browser actually uses, catching stale code
// that a separately started test server cannot detect. No records are changed.
(async () => {
  try {
    let base = 'http://localhost:5000';
    if (!checkRunningServer) {
      server = await startServer({ port: 0, host: '127.0.0.1' });
      assert.equal(typeof app, 'function');
      console.log('PASS live backend startup and index initialization');
      passed++;
      base = 'http://127.0.0.1:' + server.address().port;
    }
    for (const [route, expected, field, method = 'GET'] of [
      ['/api/users', 200, 'users'],
      ['/api/places', 200, 'places'],
      ['/api/trips/active', 403],
      ['/api/users/me/saved', 403],
      ['/api/users/me/saved/collections', 403, null, 'POST'],
      ['/api/users/me/saved/507f1f77bcf86cd799439011', 403, null, 'PUT'],
      ['/api/nonexistent', 404]
    ]) {
      const response = await fetch(base + route, { method, signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, expected, method + ' ' + route + ' (restart the backend if its routes are outdated)');
      const body = await response.json();
      if (field) assert.ok(Array.isArray(body[field]), route + ' list response');
      else assert.equal(typeof body.message, 'string');
      passed++;
      console.log('PASS live ' + method + ' ' + route + ': HTTP ' + response.status);
    }
    console.log('Live checks: ' + passed + ' passed; no account or document mutations performed.');
  } catch (error) {
    console.log('FAIL live backend check: ' + (error.code || error.name) + (error instanceof assert.AssertionError ? ': ' + error.message : ''));
    process.exitCode = 1;
  } finally {
    if (server?.listening) await new Promise(resolve => {
      server.close(resolve);
      server.closeAllConnections();
    });
    await mongoose.disconnect();
  }
})();
