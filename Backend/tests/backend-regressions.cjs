// Startup, DNS and authentication regressions. All side effects are mocked.
// Run from the project root: node Backend/tests/backend-regressions.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { createRequire } = require('node:module');
const { test } = require('node:test');

const backendRoot = path.resolve(__dirname, '..');
const backendRequire = createRequire(path.join(backendRoot, 'package.json'));
const jwt = backendRequire('jsonwebtoken');
const HttpError = backendRequire('./models/http-error');

function loadIsolated(relativePath, dependencies, environment = {}) {
  const filename = path.join(backendRoot, relativePath);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module,
    exports: module.exports,
    __dirname: path.dirname(filename),
    process: { env: environment },
    console,
    require: name => {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`Unmocked dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename });
  return module.exports;
}

function environmentHarness(environment = {}) {
  const configCalls = [];
  const dnsCalls = [];
  const helpers = loadIsolated('config/environment.js', {
    'node:path': path,
    'node:dns': { setServers: servers => dnsCalls.push(Array.from(servers)) },
    'node:net': require('node:net'),
    dotenv: { config: options => { configCalls.push(options); return {}; } },
  }, environment);
  return { ...helpers, configCalls, dnsCalls };
}

function authenticationHarness(environment) {
  const config = environmentHarness(environment);
  return loadIsolated('middleware/check-auth.js', {
    '../models/http-error': HttpError,
    jsonwebtoken: jwt,
    '../config/environment': config,
  }, environment);
}

function controllerHarness(environment, options = {}) {
  let databaseCalls = 0;
  class User {
    constructor(data) { Object.assign(this, data); this.id = 'new-user'; }
    async save() { databaseCalls++; if (options.saveError) throw options.saveError; }
    static async findOne() {
      databaseCalls++;
      if (options.existingUser === false) return null;
      return { id: 'existing-user', email: 'test@example.invalid', password: 'stored-hash' };
    }
  }
  const controller = loadIsolated('controllers/user-controllers.js', {
    '../models/http-error': HttpError,
    '../models/user': User,
    'express-validator': { validationResult: () => ({ isEmpty: () => true }) },
    bcryptjs: { hash: async () => 'stored-hash', compare: async () => true },
    jsonwebtoken: jwt,
    '../config/environment': environmentHarness(environment),
  }, environment);
  return { controller, get databaseCalls() { return databaseCalls; } };
}

function startupHarness(options = {}) {
  const environment = options.environment || {
    DATABASE_API_KEY: 'mongodb://database.invalid/snapit', JWT_API_KEY: 'test-secret',
  };
  const events = [];
  const config = environmentHarness(environment);
  const app = {
    middleware: [],
    disable() {},
    get() {},
    use(...handlers) { this.middleware.push(...handlers); },
    listen() {
      events.push('listen');
      const server = new EventEmitter();
      queueMicrotask(() => server.emit(options.listenError ? 'error' : 'listening', options.listenError));
      return server;
    },
  };
  const express = () => app;
  express.static = () => () => {};
  const mongoose = {
    async connect() {
      events.push('connect');
      if (options.connectError) throw options.connectError;
    },
    async disconnect() { events.push('disconnect'); },
  };
  const exported = loadIsolated('app.js', {
    'body-parser': { json: () => () => {} },
    path,
    fs: { unlink() { throw new Error('Unexpected filesystem mutation'); } },
    './config/environment': config,
    mongoose,
    cors: () => () => {},
    express,
    './models/http-error': HttpError,
    './routes/places-routes': () => {},
    './routes/user-routes': () => {},
    './routes/translation-routes': () => {},
    './routes/trips-routes': () => {},
    './models/trip': { async init() {
      events.push('indexes');
      if (options.initError) throw options.initError;
      if (options.indexReady) await options.indexReady;
    } },
    './config/frontend': () => {},
  }, environment);
  return { ...exported, events, config };
}

test('environment file is anchored to Backend rather than the launch directory', () => {
  const config = environmentHarness();
  config.loadEnvironment();
  assert.equal(config.configCalls[0].path, path.join(backendRoot, '.env'));
  assert.equal(config.configCalls[0].quiet, true);
});

test('production uses its own environment file without changing the development configuration', () => {
  const config = environmentHarness({ NODE_ENV:'production' });
  config.loadEnvironment();
  assert.equal(config.configCalls[0].path, path.join(backendRoot,'.env.production'));
});

test('missing startup configuration fails without revealing configured values', () => {
  const config = environmentHarness({ DATABASE_API_KEY: 'private-database-uri', JWT_API_KEY: '   ' });
  assert.throws(() => config.validateStartupEnvironment(), error => {
    assert.match(error.message, /JWT_API_KEY/);
    assert.doesNotMatch(error.message, /private-database-uri/);
    return true;
  });
});

test('production rejects short signing secrets while local development remains configurable', () => {
  const production = environmentHarness({ NODE_ENV:'production', DATABASE_API_KEY:'database', JWT_API_KEY:'short' });
  assert.throws(() => production.validateStartupEnvironment(), /at least 32 characters/);
  assert.equal(environmentHarness({ JWT_API_KEY:'local-test-secret' }).getJwtSecret(), 'local-test-secret');
  assert.equal(environmentHarness({ NODE_ENV:'production', JWT_API_KEY:'x'.repeat(32) }).getJwtSecret().length, 32);
});

test('production error responses hide unexpected internals and preserve operational errors', () => {
  const harness = startupHarness({ environment:{ NODE_ENV:'production' } });
  const handler = harness.app.middleware.at(-1);
  let status, body;
  const response = { status(code) { status = code; return this; }, json(data) { body = data; } };
  handler(new Error('internal database credential detail'), {}, response, () => {});
  assert.equal(status, 500);
  assert.doesNotMatch(body.message, /credential|database/);
  handler(new HttpError('Location service is not configured',503), {}, response, () => {});
  assert.equal(status, 503);
  assert.equal(body.message, 'Location service is not configured');
});

test('optional database DNS changes only the injected process resolver', () => {
  const config = environmentHarness({ DATABASE_DNS_SERVERS: '1.1.1.1, 2001:4860:4860::8888' });
  config.applyDatabaseDns();
  assert.deepEqual(config.dnsCalls, [['1.1.1.1', '2001:4860:4860::8888']]);
  const defaults = environmentHarness();
  defaults.applyDatabaseDns();
  assert.equal(defaults.dnsCalls.length, 0);
});

test('invalid DNS configuration fails before changing the resolver', () => {
  for (const value of ['resolver.example.invalid', '1.1.1.1,', '999.1.1.1']) {
    const config = environmentHarness({ DATABASE_DNS_SERVERS: value });
    assert.throws(() => config.applyDatabaseDns(), /DATABASE_DNS_SERVERS.*IP addresses/);
    assert.equal(config.dnsCalls.length, 0);
  }
});

test('missing or blank JWT secret rejects tokens signed with the known undefined value', () => {
  const token = jwt.sign({ userId: 'forged-user' }, 'undefined');
  for (const secret of [undefined, '', '   ']) {
    const auth = authenticationHarness(secret === undefined ? {} : { JWT_API_KEY: secret });
    const req = { method: 'GET', headers: { authorization: `Bearer ${token}` } };
    let error;
    auth(req, {}, value => { error = value; });
    assert.equal(error.code, 403);
    assert.equal(req.userData, undefined);
  }
});

test('configured JWT authentication accepts valid bearer tokens and rejects another scheme', () => {
  const auth = authenticationHarness({ JWT_API_KEY: 'configured-secret' });
  const token = jwt.sign({ userId: 'valid-user' }, 'configured-secret');
  const req = { method: 'GET', headers: { authorization: `Bearer ${token}` } };
  let error;
  auth(req, {}, value => { error = value; });
  assert.equal(error, undefined);
  assert.equal(req.userData.userId, 'valid-user');
  auth({ method: 'GET', headers: { authorization: `Basic ${token}` } }, {}, value => { error = value; });
  assert.equal(error.code, 403);
});

test('signup and login fail closed before database work when the signing secret is absent', async () => {
  for (const action of ['signUp', 'login']) {
    const harness = controllerHarness({});
    let error;
    await harness.controller[action]({
      body: { name: 'Test', email: 'test@example.invalid', password: 'password' },
      file: { filename: 'profile.jpeg' },
    }, { json() { throw new Error('Unexpected success response'); } }, value => { error = value; });
    assert.equal(error.code, 503);
    assert.equal(harness.databaseCalls, 0);
  }
});

test('login signs a verifiable token with the configured secret', async () => {
  const harness = controllerHarness({ JWT_API_KEY: 'login-test-secret' });
  let response;
  await harness.controller.login({ body: { email: 'test@example.invalid', password: 'password' } }, {
    json: value => { response = value; },
  }, error => { throw error; });
  assert.equal(jwt.verify(response.token, 'login-test-secret').userId, 'existing-user');
  const claims = jwt.decode(response.token);
  assert.equal(claims.exp - claims.iat, 120, 'Development sessions last two minutes');
});

test('signup signs a verifiable token with the configured secret', async () => {
  const harness = controllerHarness({ JWT_API_KEY: 'signup-test-secret' }, { existingUser: false });
  let response;
  let status;
  const res = {
    status: value => { status = value; return res; },
    json: value => { response = value; },
  };
  await harness.controller.signUp({
    body: { name: 'Test', email: 'test@example.invalid', password: 'password' },
    file: { filename: 'profile.jpeg' },
  }, res, error => { throw error; });
  assert.equal(status, 201);
  assert.equal(jwt.verify(response.token, 'signup-test-secret').userId, 'new-user');
  const claims = jwt.decode(response.token);
  assert.equal(claims.exp - claims.iat, 120, 'Signup uses the same short session lifetime');
});

test('session lifetime is configurable and production defaults to one hour', () => {
  assert.equal(environmentHarness({ NODE_ENV: 'production' }).getJwtLifetimeSeconds(), 3600);
  assert.equal(environmentHarness({ JWT_TTL_SECONDS: '15' }).getJwtLifetimeSeconds(), 15);
  for (const value of ['0', '-1', '1.5', 'abc', '604801']) {
    assert.throws(() => environmentHarness({ JWT_TTL_SECONDS: value }).getJwtLifetimeSeconds(), /JWT_TTL_SECONDS/);
  }
});

test('the backend rejects an expired token with the authentication failure response', () => {
  const auth = authenticationHarness({ JWT_API_KEY: 'expiry-test-secret' });
  const token = jwt.sign({ userId: 'test-user' }, 'expiry-test-secret', { expiresIn: -1 });
  let error;
  const req = { method: 'GET', headers: { authorization: `Bearer ${token}` } };
  auth(req, {}, value => { error = value; });
  assert.equal(error.code, 403);
  assert.equal(error.message, 'Authentication failed');
  assert.equal(req.userData, undefined);
});

test('importing the app opens neither database connections nor listening sockets', () => {
  const harness = startupHarness();
  assert.equal(typeof harness.app.listen, 'function');
  assert.deepEqual(harness.events, []);
  assert.equal(harness.config.configCalls.length, 1);
});

test('server waits for unique-index initialization before listening', async () => {
  let releaseIndex;
  const indexReady = new Promise(resolve => { releaseIndex = resolve; });
  const harness = startupHarness({ indexReady });
  const starting = harness.startServer({ port: 0, host: '127.0.0.1' });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(harness.events, ['connect', 'indexes']);
  releaseIndex();
  await starting;
  assert.deepEqual(harness.events, ['connect', 'indexes', 'listen']);
});

test('missing configuration and invalid ports never open database connections', async () => {
  const missing = startupHarness({ environment: {} });
  await assert.rejects(missing.startServer(), /DATABASE_API_KEY.*JWT_API_KEY/);
  assert.deepEqual(missing.events, []);
  const invalidPort = startupHarness();
  await assert.rejects(invalidPort.startServer({ port: 'invalid' }), /PORT/);
  assert.deepEqual(invalidPort.events, []);
});

test('database and index failures disconnect, avoid listening, and redact raw errors', async () => {
  const database = startupHarness({ connectError: new Error('mongodb://secret-password@host') });
  await assert.rejects(database.startServer(), error => {
    assert.match(error.message, /Could not connect to MongoDB/);
    assert.doesNotMatch(error.message, /secret-password/);
    return true;
  });
  assert.deepEqual(database.events, ['connect', 'disconnect']);
  const indexes = startupHarness({ initError: Object.assign(new Error('duplicate user details'), { code: 11000 }) });
  await assert.rejects(indexes.startServer(), /Resolve duplicate active trips/);
  assert.deepEqual(indexes.events, ['connect', 'indexes', 'disconnect']);
});

test('port conflicts produce a readable error and release the database connection', async () => {
  const harness = startupHarness({ listenError: Object.assign(new Error('raw listen failure'), { code: 'EADDRINUSE' }) });
  await assert.rejects(harness.startServer(), /port is already in use/);
  assert.deepEqual(harness.events, ['connect', 'indexes', 'listen', 'disconnect']);
});

test('non-HTTP numeric database error codes return HTTP 500', () => {
  const harness = startupHarness();
  const errorHandler = harness.app.middleware.at(-1);
  let status;
  const res = { status: value => { status = value; return res; }, json() {} };
  errorHandler({ code: 11000, message: 'Duplicate record' }, {}, res, error => { throw error; });
  assert.equal(status, 500);
});

test('error middleware forwards errors after response headers have been sent', () => {
  const harness = startupHarness();
  const errorHandler = harness.app.middleware.at(-1);
  const original = new Error('Late response error');
  let forwarded;
  errorHandler(original, {}, {
    headersSent: true,
    status() { throw new Error('Cannot write a second response'); },
  }, error => { forwarded = error; });
  assert.equal(forwarded, original);
});

function placesHarness() {
  const unlinks = [];
  const place = { creator: { id: 'owner', toString: () => 'owner', places: { pull() {} }, async save() {} },
    images: ['/uploads/images/photo.png', 'app.js', '/uploads/images/../../../app.js', 'uploads\\images\\..\\app.js'], async deleteOne() {} };
  const query = { populate() { return this; }, then: (resolve, reject) => Promise.resolve(place).then(resolve, reject) };
  const controller = loadIsolated('controllers/places-controller.js', {
    fs: { unlink: (file, callback) => { unlinks.push(file); callback(null); } },
    mongoose: { startSession: async () => ({ startTransaction() {}, async commitTransaction() {}, async abortTransaction() {}, async endSession() {} }) },
    'express-validator': { validationResult: () => ({ isEmpty: () => true }) },
    '../models/http-error': HttpError, '../utils/location': async () => ({ lat: 1, lng: 2 }),
    '../utils/upload-path': backendRequire('./utils/upload-path'), '../utils/request-input': backendRequire('./utils/request-input'),
    '../models/places': { findById: () => query }, '../models/user': {},
  });
  const invoke = async (action, userId = 'owner') => {
    const result = {};
    const res = { status() { return this; }, json: data => { result.data = data; } };
    await controller[action]({ params: { pid: 'place' }, userData: { userId }, body: { title: 'Title', description: 'Description' } }, res, error => { result.error = error; });
    return result;
  };
  return { invoke, unlinks };
}

test('place deletion removes legitimate uploads and never resolves stored paths outside images', async () => {
  const harness = placesHarness();
  const result = await harness.invoke('deletePlace');
  assert.equal(result.error, undefined);
  assert.deepEqual(harness.unlinks, [path.join(backendRoot, 'uploads', 'images', 'photo.png')]);
});

test('editing and deleting someone else’s place are permission errors rather than expired sessions', async () => {
  const harness = placesHarness();
  for (const action of ['updatePlace', 'deletePlace']) {
    const result = await harness.invoke(action, 'another-user');
    assert.equal(result.error.code, 403);
    assert.notEqual(result.error.message, 'Authentication failed');
  }
  assert.deepEqual(harness.unlinks, []);
});

test('public user listing projects only public profile data', async () => {
  const user = { name: 'Traveler', image: '/uploads/images/profile.png', places: [], email: 'private@example.invalid', password: 'hash', trips: ['private-trip'], followers: [], following: [] };
  const dependencies = {
    '../models/http-error': HttpError,
    '../models/user': { find: async (_, projection) => [{ toObject: () => {
      const keys = projection.startsWith('-') ? Object.keys(user).filter(key => !projection.split(' ').includes('-' + key)) : projection.split(' ');
      return Object.fromEntries(keys.map(key => [key, user[key]]));
    } }] },
    'express-validator': {}, bcryptjs: {}, jsonwebtoken: {}, '../config/environment': {},
  };
  const controller = loadIsolated('controllers/user-controllers.js', dependencies);
  let response;
  const res = { status() { return this; }, json: data => { response = data; } };
  await controller.getUser({}, res, error => { throw error; });
  assert.equal(response.users[0].name, 'Traveler');
  for (const key of ['email', 'password', 'trips', 'followers', 'following']) assert.equal(key in response.users[0], false);
});

test('signup reports existing email and unique-name collisions as HTTP 409', async () => {
  for (const options of [{}, { existingUser: false, saveError: { code: 11000 } }]) {
    const harness = controllerHarness({ JWT_API_KEY: 'test-secret' }, options);
    let error;
    await harness.controller.signUp({ body: { name: 'Test', email: 'test@example.invalid', password: 'password' }, file: { filename: 'photo.png' } }, {}, value => { error = value; });
    assert.equal(error.code, 409);
  }
});

test('invalid database field values return a client error without internal model details', () => {
  const handler = startupHarness().app.middleware.at(-1);
  for (const name of ['ValidationError', 'CastError']) {
    let status, body;
    const res = { status: value => { status = value; return res; }, json: value => { body = value; } };
    handler({ name, message: 'internal collection and field details' }, {}, res, error => { throw error; });
    assert.equal(status, 422);
    assert.doesNotMatch(body.message, /internal collection/);
  }
});

test('file upload size/count errors are HTTP 400 rather than server errors', () => {
  const handler = startupHarness().app.middleware.at(-1);
  for (const code of ['LIMIT_FILE_SIZE', 'LIMIT_UNEXPECTED_FILE']) {
    let status;
    const res = { status: value => { status = value; return res; }, json() {} };
    handler({ name: 'MulterError', code, message: 'Upload rejected' }, {}, res, error => { throw error; });
    assert.equal(status, 400);
  }
});

test('response errors preserve uploaded photos already referenced by saved records', () => {
  const handler = startupHarness().app.middleware.at(-1);
  let status;
  const res = { status(value) { status = value; return this; }, json() {} };
  // The harness throws if fs.unlink is called, so a saved photo must be retained.
  handler(new Error('Response read failed'), { uploadsCommitted: true, files: [{ path: 'saved-photo.png' }] }, res, error => { throw error; });
  assert.equal(status, 500);
});

test('coordinate validation rejects blank/null/boolean values while accepting zero coordinates', () => {
  const { validCoords, readPoint } = backendRequire('./utils/request-input');
  for (const value of ['', ' ', null, undefined, false, [], {}]) assert.ok(!validCoords({ lat: value, lng: 10 }));
  assert.ok(validCoords({ lat: 0, lng: '0' }));
  assert.deepEqual(readPoint('{"lat":0,"lng":0}'), { lat: 0, lng: 0 });
  for (const value of ['{bad', '{"lat":null,"lng":0}', { lat: 91, lng: 0 }]) assert.throws(() => readPoint(value), error => error.code === 422);
});

test('geocoding requests have bounded timeouts and normalize provider coordinates', async () => {
  const calls = [];
  const locate = loadIsolated('utils/location.js', {
    axios: { get: async (url, config) => {
      calls.push({ url, config });
      return { data: url.endsWith('/reverse') ? { display_name: 'Test address' } : [{ lat: '0', lon: '77' }] };
    } },
    '../models/http-error': HttpError,
    './request-input': backendRequire('./utils/request-input'),
  }, { MAP_API_KEY: 'fixture-key' });
  const point = await locate(' Test address ');
  assert.deepEqual({ ...point }, { lat: 0, lng: 77 });
  assert.equal(await locate.getAddressForCoords(point), 'Test address');
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.config.timeout, 10000);
    assert.equal(call.config.params.key, 'fixture-key');
    assert.ok(!call.url.includes('fixture-key'));
  }
});

test('geocoding provider errors become readable client errors without leaking raw details', async () => {
  const dependencies = {
    axios: { get: async () => { throw new Error('private-provider-details'); } },
    '../models/http-error': HttpError,
    './request-input': backendRequire('./utils/request-input'),
  };
  const locate = loadIsolated('utils/location.js', dependencies, { MAP_API_KEY: 'fixture-key' });
  await assert.rejects(locate('Test address'), error => error.code === 502 && !error.message.includes('private-provider-details'));
  await assert.rejects(locate.getAddressForCoords({ lat: 0, lng: 0 }), error => error.code === 502);
  const unconfigured = loadIsolated('utils/location.js', dependencies);
  await assert.rejects(unconfigured('Test address'), error => error.code === 503);
});

test('malformed itinerary, expenses and visited dates produce HTTP 422', () => {
  const { readExpenses, readItinerary, readVisitedAt } = backendRequire('./utils/request-input');
  for (const value of ['{bad', '{}', null, [null], [{ amount: '' }], [{ amount: -1 }], [{ amount: true }]]) {
    assert.throws(() => readExpenses(value), error => error.code === 422);
  }
  for (const value of ['{bad', {}, null, [{ day: 0, plannedPlace: 'Place' }], [{ day: 1.5, plannedPlace: 'Place' }], [{ day: 1, plannedPlace: ' ' }]]) {
    assert.throws(() => readItinerary(value), error => error.code === 422);
  }
  for (const value of ['', null, true, 'not a date']) assert.throws(() => readVisitedAt(value), error => error.code === 422);
  assert.equal(readExpenses([{ amount: '1.25', category: 'Food' }])[0].amount, 1.25);
});
