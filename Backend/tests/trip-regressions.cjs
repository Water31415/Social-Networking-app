// Safe regression checks: controller database/provider/filesystem effects are mocked.
// Run from the project root: node Backend/tests/trip-regressions.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');

const projectRoot = path.resolve(__dirname, '..', '..');
const backendRoot = path.join(projectRoot, 'Backend');
const controllerPath = path.join(backendRoot, 'controllers', 'trips-controller.js');
const controllerSource = fs.readFileSync(controllerPath, 'utf8');

function makeControllerHarness({ geocodingFails = false } = {}) {
  class HttpError extends Error {
    constructor(message, code) {
      super(message);
      this.code = code;
    }
  }

  const unlinks = [];
  const geocodes = [];
  const saves = { trip: 0, stop: 0 };
  const trip = {
    _id: 'trip',
    creator: 'owner',
    status: 'completed',
    startedAt: new Date('2026-10-28T09:00:00.000Z'),
    stops: { pull: () => {} },
    save: async () => { saves.trip++; },
    deleteOne: async () => {},
  };
  const stop = {
    _id: 'stop',
    title: 'Original stop',
    note: '',
    images: ['/uploads/images/real.jpeg'],
    location: { lat: 12, lng: 77 },
    address: 'Original address',
    expenses: [],
    save: async () => { saves.stop++; },
  };
  const geocode = async address => {
    geocodes.push(address);
    if (geocodingFails) throw new Error('Mock location provider unavailable');
    return { lat: 13, lng: 78 };
  };
  geocode.getAddressForCoords = async () => 'Mock address';
  const dependencies = {
    fs: {
      // Deliberately never call the real filesystem mutation API.
      unlink: (target, callback) => {
        unlinks.push(target);
        callback(null);
      },
    },
    path,
    'express-validator': { validationResult: () => ({ isEmpty: () => true }) },
    '../models/http-error': HttpError,
    '../models/trip': { findById: async () => trip },
    '../models/trip-stop': {
      findOne: async () => stop,
      findOneAndDelete: async () => stop,
      deleteMany: async () => {},
      find: () => ({
        sort: async () => [stop],
        then: (resolve, reject) => Promise.resolve([stop]).then(resolve, reject),
      }),
    },
    '../models/user': { findById: async () => null },
    '../utils/location': geocode,
  };
  const controller = {};
  vm.runInNewContext(controllerSource, {
    exports: controller,
    require: name => {
      if (!Object.hasOwn(dependencies, name)) {
        throw new Error(`Unmocked controller dependency: ${name}`);
      }
      return dependencies[name];
    },
    __dirname: path.dirname(controllerPath),
    console,
    Date,
  }, { filename: controllerPath });

  const invoke = async (method, body = {}, extras = {}) => {
    const result = {};
    await controller[method]({
      params: { tid: 'trip', sid: 'stop' },
      userData: { userId: 'owner' },
      body,
      ...extras,
    }, {
      json: data => { result.data = data; },
    }, error => { result.error = error; });
    return result;
  };

  return { updateStop: body => invoke('updateStop', body), invoke, stop, trip, saves, unlinks, geocodes };
}

test('retained image paths cannot schedule deletion of backend application files', async () => {
  const harness = makeControllerHarness();
  const forged = await harness.updateStop({ keepImages: JSON.stringify(['app.js']) });
  await harness.updateStop({ keepImages: '[]' });
  const uploadRoot = path.join(backendRoot, 'uploads', 'images');
  const unsafeUnlinks = harness.unlinks.filter(target => {
    const relative = path.relative(uploadRoot, target);
    return relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
  });

  assert.deepEqual({
    forgedPathsRejected: [400, 403, 422].includes(forged.error?.code || forged.error?.status),
    unsafeUnlinks,
  }, {
    forgedPathsRejected: true,
    unsafeUnlinks: [],
  }, 'Reject paths outside the existing stop images and keep deletions inside uploads/images. All unlink calls in this test are mocked.');
});

test('malformed, non-string, foreign, and traversal image paths are rejected before changing a stop', async t => {
  const cases = [
    ['malformed JSON', '{'],
    ['empty JSON', ''],
    ['object', '{}'],
    ['null', 'null'],
    ['JSON string', '"/uploads/images/real.jpeg"'],
    ['numeric entry', '[1]'],
    ['null entry', '[null]'],
    ['another stop image', '["/uploads/images/unowned.jpeg"]'],
    ['traversal', '["/uploads/images/../../../app.js"]'],
    ['Windows traversal', JSON.stringify(['uploads\\images\\..\\..\\app.js'])],
    ['absolute backend path', JSON.stringify([path.join(backendRoot, 'app.js')])],
  ];
  for (const [label, keepImages] of cases) {
    await t.test(label, async () => {
      const harness = makeControllerHarness();
      const result = await harness.updateStop({ keepImages, title: 'Must not change', address: 'Must not geocode' });
      assert.equal(result.error?.code, 422);
      assert.equal(harness.stop.title, 'Original stop');
      assert.equal(harness.saves.stop, 0);
      assert.deepEqual(harness.geocodes, []);
      assert.deepEqual(harness.unlinks, []);
    });
  }
});

test('legitimate image retention and removal preserve kept files and remove only discarded uploads', async () => {
  const harness = makeControllerHarness();
  harness.stop.images.push('/uploads/images/second.png');
  const result = await harness.updateStop({ keepImages: '["/uploads/images/second.png"]' });
  assert.equal(result.error, undefined);
  assert.deepEqual([...harness.stop.images], ['/uploads/images/second.png']);
  assert.deepEqual(harness.unlinks, [path.join(backendRoot, 'uploads', 'images', 'real.jpeg')]);
  assert.equal(harness.saves.stop, 1);
});

test('omitting retained images keeps the existing photos', async () => {
  const harness = makeControllerHarness();
  const result = await harness.updateStop({ note: 'Changed note' });
  assert.equal(result.error, undefined);
  assert.deepEqual([...harness.stop.images], ['/uploads/images/real.jpeg']);
  assert.deepEqual(harness.unlinks, []);
});

test('all trip cleanup operations ignore unsafe image paths already stored in the database', async t => {
  for (const method of ['updateStop', 'deleteStop', 'deleteTrip', 'publishTrip']) {
    await t.test(method, async () => {
      const harness = makeControllerHarness();
      harness.stop.images.push('app.js', '/uploads/images/../../../app.js', 'uploads\\images\\..\\..\\app.js');
      harness.trip.coverImage = '/uploads/images/../../../app.js';
      const result = await harness.invoke(method, { keepImages: '[]' }, { file: { filename: 'newcover.jpeg' } });
      assert.equal(result.error, undefined);
      assert.deepEqual(harness.unlinks, method === 'publishTrip' ? [] : [path.join(backendRoot, 'uploads', 'images', 'real.jpeg')]);
    });
  }
});

test('saving a note with an unchanged address preserves the original GPS location', async () => {
  const harness = makeControllerHarness({ geocodingFails: true });
  const originalLocation = { ...harness.stop.location };
  const result = await harness.updateStop({
    title: harness.stop.title,
    note: 'Changed note only',
    address: harness.stop.address,
    keepImages: JSON.stringify(harness.stop.images),
    expenses: '[]',
  });

  assert.equal(result.error, undefined, 'A note-only save should succeed.');
  assert.deepEqual({
    location: { ...harness.stop.location },
    geocodes: harness.geocodes,
  }, {
    location: originalLocation,
    geocodes: [],
  }, 'An unchanged address must not trigger geocoding or replace the photo/browser GPS coordinates.');
});

test('changing the address resolves and saves its new coordinates', async () => {
  const harness = makeControllerHarness();
  const result = await harness.updateStop({ address: '  New address  ' });
  assert.equal(result.error, undefined);
  assert.equal(harness.stop.address, 'New address');
  assert.deepEqual(harness.geocodes, ['New address']);
  assert.deepEqual({ ...harness.stop.location }, { lat: 13, lng: 78 });
});

test('an explicit replacement GPS location takes priority over address geocoding', async () => {
  const harness = makeControllerHarness();
  const result = await harness.updateStop({ address: 'New address', exifLocation: '{"lat":19,"lng":73}' });
  assert.equal(result.error, undefined);
  assert.deepEqual(harness.geocodes, []);
  assert.deepEqual({ ...harness.stop.location }, { lat: 19, lng: 73 });
});

test('an invalid visited time returns a client error before saving', async () => {
  const harness = makeControllerHarness();
  const result = await harness.updateStop({ visitedAt: '' });
  assert.equal(result.error?.code, 422);
  assert.equal(harness.saves.stop, 0);
});

function getVisitedTimeExpressions() {
  const frontendRequire = createRequire(path.join(projectRoot, 'Frontend', 'package.json'));
  const parser = frontendRequire('@babel/parser');
  const reviewPath = path.join(projectRoot, 'Frontend', 'src', 'trips', 'pages', 'ReviewTrip.js');
  const source = fs.readFileSync(reviewPath, 'utf8');
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  let input;
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXOpeningElement' && node.name.name === 'input'
      && node.attributes.some(attribute => attribute.name?.name === 'type' && attribute.value?.value === 'datetime-local')) {
      input = node;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(ast);
  assert.ok(input, 'The review page should contain a visited-time input.');
  const expression = name => {
    const attribute = input.attributes.find(item => item.name?.name === name);
    assert.equal(attribute?.value?.type, 'JSXExpressionContainer', `Expected ${name} expression on the visited-time input.`);
    return source.slice(attribute.value.expression.start, attribute.value.expression.end);
  };
  const helpers = ast.program.body.filter(node => node.type === 'VariableDeclaration'
    && node.declarations.some(declaration => ['toLocalDateTime', 'fromLocalDateTime'].includes(declaration.id.name)))
    .map(node => source.slice(node.start, node.end)).join('\n');
  return { value: expression('value'), onChange: expression('onChange'), helpers };
}

function withTimezone(timezone, run) {
  const previousTimezone = process.env.TZ;
  process.env.TZ = timezone;
  try {
    return run();
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
}

function makeVisitedTimeHarness(original) {
  const expressions = getVisitedTimeExpressions();
  const edits = [];
  const context = vm.createContext({
    Date,
    stop: { id: 'stop', visitedAt: original },
    editStop: (id, field, value) => { edits.push({ id, field, value }); },
  });
  // Evaluate the actual helpers and JSX expressions rather than copying their behavior.
  vm.runInContext(expressions.helpers, context);
  return {
    displayed: vm.runInContext(`(${expressions.value})`, context),
    change: vm.runInContext(`(${expressions.onChange})`, context),
    edits,
  };
}

test('visited-time input displays local time and round-trips the original instant in IST', () => {
  withTimezone('Asia/Kolkata', () => {
    const original = '2026-10-28T09:30:00.000Z';
    const harness = makeVisitedTimeHarness(original);
    harness.change({ target: { value: harness.displayed } });
    assert.deepEqual({ displayed: harness.displayed, saved: harness.edits[0]?.value }, {
      displayed: '2026-10-28T15:00',
      saved: original,
    });
  });
});

test('visited-time input round-trips dates across the local calendar boundary', () => {
  withTimezone('America/Los_Angeles', () => {
    const original = '2026-10-28T01:30:00.000Z';
    const harness = makeVisitedTimeHarness(original);
    assert.equal(harness.displayed, '2026-10-27T18:30');
    harness.change({ target: { value: harness.displayed } });
    assert.equal(harness.edits[0]?.value, original);
  });
});

test('clearing or entering an invalid visited time keeps the last valid instant without throwing', () => {
  const harness = makeVisitedTimeHarness('2026-10-28T09:30:00.000Z');
  for (const value of ['', 'invalid-date']) {
    assert.doesNotThrow(() => harness.change({ target: { value } }));
  }
  assert.deepEqual(harness.edits, []);
});

test('an unavailable or malformed stored visited time renders safely', () => {
  for (const value of ['', null, undefined, 'invalid-date']) {
    assert.equal(makeVisitedTimeHarness(value).displayed, '');
  }
});
