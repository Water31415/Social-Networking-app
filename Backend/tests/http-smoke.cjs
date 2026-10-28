const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..', '..');
const backend = file => path.join(root, 'Backend', file);
require(backend('node_modules/dotenv')).config({ path: backend('.env'), quiet: true });
process.env.JWT_API_KEY = 'snapit-isolated-smoke-test';
delete process.env.GOOGLE_TRANSLATE_API_KEY;
const mongoose = require(backend('node_modules/mongoose'));
const jwt = require(backend('node_modules/jsonwebtoken'));
const User = require(backend('models/user'));
const Place = require(backend('models/places'));
const Trip = require(backend('models/trip'));
const TripStop = require(backend('models/trip-stop'));
const axios = require(backend('node_modules/axios'));

// Exercise the real app and routes while keeping the database and provider offline.
mongoose.connect = async () => mongoose;
mongoose.set('bufferCommands', false);
const chain = value => ({
  populate() { return this; }, sort() { return this; },
  limit() { return this; }, select() { return this; },
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); }
});
User.find = () => chain([]);
User.findOne = async () => null;
Place.find = () => chain([]);
Trip.findOne = async () => null;
Trip.find = () => chain([]);
TripStop.find = () => chain([]);
axios.get = async () => ({ data: { display_name: 'Mocked location, India' } });
let server;
let passed = 0, failed = 0;
const token = jwt.sign({ userId: '507f1f77bcf86cd799439011', email: 'test@example.invalid' },
  process.env.JWT_API_KEY, { expiresIn: '5m' });

(async () => {
  try {
    const { app } = require(backend('app.js'));
    await new Promise((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', resolve);
      server.once('error', reject);
    });
    const base = 'http://127.0.0.1:' + server.address().port;
    async function check(name, url, options, status, verify) {
      try {
        const response = await fetch(base + url, { ...options, signal: AbortSignal.timeout(4000) });
        assert.equal(response.status, status, 'HTTP status');
        if (verify) await verify(response);
        passed++;
        console.log('PASS ' + name);
      } catch (error) {
        failed++;
        console.log('FAIL ' + name + ': ' + error.message);
      }
    }
    const auth = { Authorization: 'Bearer ' + token };
    const json = body => ({ method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    await check('unknown route gives JSON 404', '/api/nonexistent', {}, 404,
      async r => assert.equal(typeof (await r.json()).message, 'string'));
    await check('allowed CORS origin', '/api/nonexistent', { headers: { Origin: 'http://localhost:3000' } }, 404,
      r => assert.equal(r.headers.get('access-control-allow-origin'), 'http://localhost:3000'));
    await check('CORS preflight allows Authorization', '/api/trips/active', { method: 'OPTIONS', headers: {
      Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'Authorization'
    } }, 204, r => assert.match(r.headers.get('access-control-allow-headers'), /Authorization/i));
    await check('public user list', '/api/users', {}, 200, async r => assert.deepEqual((await r.json()).users, []));
    await check('public places list', '/api/places', {}, 200, async r => assert.deepEqual((await r.json()).places, []));
    await check('trips require authentication', '/api/trips/active', {}, 403);
    await check('place creation requires authentication', '/api/places', { method: 'POST' }, 403);
    await check('invalid bearer token rejected', '/api/trips/active', { headers: { Authorization: 'Bearer invalid' } }, 403);
    await check('valid bearer token accepted', '/api/trips/active', { headers: auth }, 200,
      async r => assert.equal((await r.json()).trip, null));
    await check('invalid login body rejected', '/api/users/login', json({}), 422);
    await check('invalid signup body rejected', '/api/users/signup', json({}), 422);
    await check('signup requires profile image', '/api/users/signup', json({ name: 'Test', email: 'test@example.invalid', password: 'testpassword' }), 422);
    await check('unknown login account rejected', '/api/users/login', json({ email: 'test@example.invalid', password: 'testpassword' }), 401);
    await check('trip title required', '/api/trips/start', json({}), 422);
    await check('negative trip budget rejected', '/api/trips/start', json({ title: 'Test', plannedBudget: -1 }), 422);
    await check('out-of-range starting coordinates rejected', '/api/trips/start', json({ title: 'Test', startLocation: { lat: 91, lng: 0 } }), 422);
    await check('invalid reverse-geocode coordinates rejected', '/api/trips/location/reverse-geocode', json({ lat: 91, lng: 0 }), 422);
    await check('reverse geocoding normal response (provider mocked)', '/api/trips/location/reverse-geocode', json({ lat: 28.6, lng: 77.2 }), 200,
      async r => assert.equal((await r.json()).address, 'Mocked location, India'));
    await check('place creation requires photos', '/api/places', json({ title: 'Test', description: 'A long description', address: 'Delhi' }), 422);
    await check('nearby rejects invalid coordinates', '/api/places/nearby?lat=999&lng=0', {}, 422);
    await check('nearby accepts valid coordinates', '/api/places/nearby?lat=28.6&lng=77.2', {}, 200,
      async r => assert.deepEqual((await r.json()).places, []));
    await check('empty translation body rejected', '/api/translate', json({}), 422);
    await check('missing translation key returns 503', '/api/translate', json({ text: 'Hello', target: 'hi' }), 503);
    await check('following self rejected', '/api/users/507f1f77bcf86cd799439011/follow', json({}), 422);
    await check('malformed JSON returns 400', '/api/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' }, 400);
    const form = new FormData();
    form.append('image', new Blob(['plain text'], { type: 'text/plain' }), 'bad.txt');
    await check('unsupported upload MIME type rejected', '/api/users/signup', { method: 'POST', body: form }, 400);
    console.log('Isolated HTTP smoke checks: ' + passed + ' passed, ' + failed + ' failed. Database and external provider mocked; no persistent data written.');
    if (failed) process.exitCode = 1;
  } catch (error) {
    console.log('HTTP harness unable to run: ' + (error.code || error.name) + ': ' + error.message);
    process.exitCode = 1;
  } finally {
    if (server?.listening) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  }
})();
