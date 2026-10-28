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
    async save() { databaseCalls++; }
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
  }, environment);
  return { ...exported, events, config };
}

test('environment file is anchored to Backend rather than the launch directory', () => {
  const config = environmentHarness();
  config.loadEnvironment();
  assert.equal(config.configCalls[0].path, path.join(backendRoot, '.env'));
  assert.equal(config.configCalls[0].quiet, true);
});

test('missing startup configuration fails without revealing configured values', () => {
  const config = environmentHarness({ DATABASE_API_KEY: 'private-database-uri', JWT_API_KEY: '   ' });
  assert.throws(() => config.validateStartupEnvironment(), error => {
    assert.match(error.message, /JWT_API_KEY/);
    assert.doesNotMatch(error.message, /private-database-uri/);
    return true;
  });
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
