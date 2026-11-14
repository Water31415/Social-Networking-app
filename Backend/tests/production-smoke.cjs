// Real production HTTP/static handling with database reads mocked. Build first.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
process.env.NODE_ENV = 'production'
process.env.JWT_API_KEY = 'production-smoke-test-key-not-used-for-real-accounts'
process.env.FRONTEND_ORIGINS = 'https://snapit.example.invalid'
delete process.env.SERVE_FRONTEND
const mongoose = require('../node_modules/mongoose')
const User = require('../models/user')
let databaseReady = false, disconnected = false, server, passed = 0
const originalReady = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState')
Object.defineProperty(mongoose.connection, 'readyState', { configurable:true, get:() => databaseReady ? 1 : 0 })
const originalFind = User.find, originalDisconnect = mongoose.disconnect
User.find = async () => []
mongoose.disconnect = async () => { disconnected = true; databaseReady = false }
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
;(async () => {
  try {
    const { app, shutdownServer } = require('../app')
    server = await new Promise((resolve, reject) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
      instance.once('error', reject)
    })
    const base = `http://127.0.0.1:${server.address().port}`
    const check = async (name, route, status, verify, options = {}) => {
      const response = await fetch(base + route, { signal:AbortSignal.timeout(5000), ...options })
      assert.equal(response.status, status, name)
      if (verify) await verify(response)
      passed++; console.log('PASS ' + name)
    }
    await check('liveness without a database connection', '/healthz', 200, async response => {
      assert.equal(response.headers.get('cache-control'), 'no-store')
      assert.equal(response.headers.get('x-powered-by'), null)
      assert.deepEqual(await response.json(), { status:'ok' })
    })
    await check('readiness rejects a disconnected database', '/readyz', 503)
    databaseReady = true
    await check('readiness accepts a connected database', '/readyz', 200)
    let html
    for (const route of ['/', '/saved', '/dashboard', '/trips/example/review']) {
      await check('SPA refresh ' + route, route, 200, async response => {
        assert.match(response.headers.get('content-type'), /text\/html/)
        assert.equal(response.headers.get('cache-control'), 'no-cache')
        html = await response.text(); assert.match(html, /<div id="root">/)
      }, { headers:{ Accept:'text/html' } })
    }
    const asset = html.match(/src="(\/assets\/[^\"]+\.js)"/)[1]
    await check('hashed frontend assets and production API address', asset, 200, async response => {
      assert.match(response.headers.get('cache-control'), /immutable/)
      const javascript = await response.text()
      assert.ok(!javascript.includes('http://localhost:5000'), 'Production JavaScript must not point at a developer machine')
    })
    await check('unhashed theme script is not cached permanently', '/theme-init.js', 200, response => assert.ok(!response.headers.get('cache-control').includes('immutable')))
    await check('API responses prevent caching', '/api/users', 200, response => assert.equal(response.headers.get('cache-control'), 'no-store'))
    for (const route of ['/api/nonexistent', '/api', '/uploads/images/missing-deployment-image.png', '/assets/missing.js']) {
      await check('missing resources remain JSON 404: ' + route, route, 404, async response => {
        assert.match(response.headers.get('content-type'), /application\/json/)
        assert.equal(typeof (await response.json()).message, 'string')
      }, { headers:{ Accept:'text/html' } })
    }
    await check('saved places stay protected in production', '/api/users/me/saved', 403)
    const started = deferred(), release = deferred()
    User.find = () => { started.resolve(); return release.promise }
    const inflight = fetch(base + '/api/users', { signal:AbortSignal.timeout(5000) })
    await started.promise
    let closed = false
    const closing = shutdownServer(server, 1000).then(() => { closed = true })
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(closed, false, 'Shutdown must wait for an active request')
    release.resolve([])
    assert.equal((await inflight).status, 200)
    await closing
    assert.equal(server.listening, false); assert.equal(disconnected, true)
    passed++; console.log('PASS graceful shutdown drains requests and disconnects the database')
    assert.ok(fs.existsSync(path.resolve(__dirname, '../../Frontend/build/index.html')))
    console.log(`Production checks: ${passed} passed; database mocked, no account or document writes.`)
  } catch (error) {
    console.error('FAIL production check: ' + error.message); process.exitCode = 1
  } finally {
    if (server?.listening) await new Promise(resolve => { server.close(resolve); server.closeAllConnections() })
    User.find = originalFind; mongoose.disconnect = originalDisconnect
    if (originalReady) Object.defineProperty(mongoose.connection, 'readyState', originalReady)
    else delete mongoose.connection.readyState
  }
})()
