// Run from the project root: node Backend/tests/frontend-regressions.cjs
// Behavioral regression checks for place creation, editing, deletion, and sharing.
// Requests and visual effects are mocked; this script never contacts the backend.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const vm = require('node:vm');
const { test, after } = require('node:test');

const projectRoot = path.resolve(__dirname, '..', '..');
const frontendRoot = path.join(projectRoot, 'Frontend');
const sourceRoot = path.join(frontendRoot, 'src') + path.sep;
const frontendRequire = Module.createRequire(path.join(frontendRoot, 'package.json'));
const babel = frontendRequire('@babel/core');
const originalJsLoader = require.extensions['.js'];
const originalCssLoader = require.extensions['.css'];
const originalModuleLoad = Module._load;

require.extensions['.js'] = (module, filename) => {
  if (!filename.startsWith(sourceRoot)) return originalJsLoader(module, filename);
  const result = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    configFile: false,
    babelrc: false,
    presets: [
      frontendRequire.resolve('@babel/preset-react'),
      [frontendRequire.resolve('@babel/preset-env'), { targets: { node: 'current' } }]
    ]
  });
  module._compile(result.code, filename);
};
require.extensions['.css'] = () => {};

const { JSDOM } = frontendRequire('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/'
});
global.window = dom.window;
global.document = dom.window.document;
global.FormData = dom.window.FormData;
global.FileReader = dom.window.FileReader;
global.CustomEvent = dom.window.CustomEvent;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.navigator.geolocation = {
  getCurrentPosition: success => success({ coords: { latitude: 28.6, longitude: 77.2 } })
};
global.IS_REACT_ACT_ENVIRONMENT = true;

const React = frontendRequire('react');
const { act } = React;
const { createRoot } = frontendRequire('react-dom/client');
const { Simulate } = frontendRequire('react-dom/test-utils');
const requests = [];
const emptyTrips = [];
const noop = () => {};
const place = {
  id: 'place1',
  title: 'Existing title',
  description: 'Existing description',
  address: 'Delhi',
  creator: 'user1',
  location: { lat: 28.6, lng: 77.2 },
  images: ['/uploads/images/test.png']
};

const sendRequest = async (...args) => {
  requests.push(args);
  return {
    place: JSON.parse(JSON.stringify(place)),
    places: [JSON.parse(JSON.stringify(place))]
  };
};

const SimpleButton = props => React.createElement('button', {
  type: props.type || 'button',
  onClick: props.onClick,
  disabled: props.disabled
}, props.children);

const SimpleModal = props => props.show
  ? React.createElement('section', { role: 'dialog', 'aria-label': props.dialogLabel }, props.header, props.children, props.footer)
  : null;

const SimpleMasonry = props => React.createElement('div', null,
  props.items.map((item, index) => React.createElement('button', {
    key: item.id,
    type: 'button',
    'data-test-tile': item.id,
    onClick: event => props.onItemClick(item, index, event)
  }, item.title))
);

Module._load = function (request, parent, isMain) {
  if (parent?.filename.startsWith(sourceRoot)) {
    const clean = request.replaceAll('\\', '/');
    if (clean.endsWith('/hooks/http-hook')) {
      return { useHttpClient: () => ({ isLoading: false, error: null, clearError: noop, sendRequest }) };
    }
    if (clean.endsWith('/components/UI') || clean === '../UI') {
      return { LoadingText: () => null, MorphSlider: () => null, PulseHeart: () => null, Masonry: SimpleMasonry };
    }
    if (clean.endsWith('/hooks/useTripFeed')) return { __esModule: true, default: () => emptyTrips };
    if (clean.endsWith('/components/TripFeed')) return { TripFeedCard: () => null };
    if (clean.endsWith('/UIElements/ErrorModal')) return { __esModule: true, default: () => null };
    if (clean.endsWith('/UIElements/Card')) {
      return { __esModule: true, default: props => React.createElement('div', null, props.children) };
    }
    if (clean.endsWith('/UIElements/Modal')) return { __esModule: true, default: SimpleModal };
    if (clean.endsWith('/UIElements/Map')) return { __esModule: true, default: () => null };
    if (clean.endsWith('/FormElements/Button')) return { __esModule: true, default: SimpleButton };
  }
  return originalModuleLoad.apply(this, arguments);
};

const { MemoryRouter } = frontendRequire('react-router-dom');
const { AuthContext } = require(path.join(sourceRoot, 'shared/components/context/auth-context.js'));
const { PlaceSearchContext } = require(path.join(sourceRoot, 'shared/components/context/place-search-context.js'));
const TripContext = require(path.join(sourceRoot, 'shared/components/context/trip-context.js')).default;
const ActiveTripLink = require(path.join(sourceRoot, 'trips/components/ActiveTripLink.js')).default;
const { getSessionExpiration, notifySessionRejected } = require(path.join(sourceRoot, 'shared/Utils/session.js'));
const NewPlace = require(path.join(sourceRoot, 'places/pages/NewPlaces.js')).default;
const UpdatePlace = require(path.join(sourceRoot, 'places/pages/UpdatePlace.js')).default;
const PlaceList = require(path.join(sourceRoot, 'places/components/PlaceList.js')).default;
const Places = require(path.join(sourceRoot, 'places/pages/places.js')).default;
const NearbyPlaces = require(path.join(sourceRoot, 'places/pages/NearbyPlaces.js')).default;
const auth = { token: 'mock-token', userId: 'user1', isLoggedIn: true };

async function mount(t, Component, route = '/') {
  requests.length = 0;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  t.after(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  await act(async () => root.render(
    React.createElement(AuthContext.Provider, { value: auth },
      React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(Component)))
  ));
  return container;
}

const change = (container, selector, value) => Simulate.change(
  container.querySelector(selector), { target: { value } }
);
const buttonByText = (container, label) => [...container.querySelectorAll('button')]
  .find(button => button.textContent === label);

test('creating a place requires a photo before enabling submission', async t => {
  const container = await mount(t, NewPlace);
  await act(async () => {
    change(container, '#title', 'My place');
    change(container, '#description', 'A valid description');
    change(container, '#address', 'Delhi');
  });
  assert.equal(container.querySelector('input[type="file"]').files.length, 0);
  assert.equal(container.querySelector('button[type="submit"]').disabled, true,
    'ADD PLACE must remain disabled when no image has been selected');
  await act(async () => Simulate.submit(container.querySelector('form')));
  assert.equal(requests.length, 0, 'A forced invalid submit must not send a request');
  assert.match(container.querySelector('[role="alert"]').textContent, /select at least one/i,
    'A forced invalid submit must show an actionable photo validation error');
});

test('a loaded place can be submitted after editing only its title', async t => {
  const container = await mount(t, UpdatePlace);
  assert.equal(container.querySelector('#title').value, place.title);
  assert.equal(container.querySelector('#description').value, place.description);
  await act(async () => change(container, '#title', 'Changed title'));
  assert.equal(container.querySelector('button[type="submit"]').disabled, false,
    'The untouched, already-valid description must not prevent saving a title change');
  await act(async () => Simulate.submit(container.querySelector('form')));
  const patch = requests.find(([, method]) => method === 'PATCH');
  assert.ok(patch, 'Saving a title-only change must send a PATCH request');
  assert.deepEqual(JSON.parse(patch[2]), { title: 'Changed title', description: place.description });
});

test('a valid photo enables creation and is sent with the place details', async t => {
  const container = await mount(t, NewPlace);
  const photo = new window.File(['photo bytes'], 'place.png', { type: 'image/png' });
  await act(async () => {
    change(container, '#title', 'My place');
    change(container, '#description', 'A valid description');
    change(container, '#address', 'Delhi');
    Simulate.change(container.querySelector('input[type="file"]'), { target: { files: [photo] } });
    await new Promise(resolve => setTimeout(resolve, 20));
  });
  assert.equal(container.querySelector('button[type="submit"]').disabled, false);
  await act(async () => Simulate.submit(container.querySelector('form')));
  const post = requests.find(([, method]) => method === 'POST');
  assert.ok(post, 'A valid place must send a POST request');
  assert.equal(post[2].get('title'), 'My place');
  assert.equal(post[2].getAll('images').length, 1);
  assert.equal(post[2].get('images').name, 'place.png');
});

test('deleting an owned place removes it from the home feed', async t => {
  const container = await mount(t, Places);
  const itemSelector = '[data-test-tile="place-place1"]';
  assert.ok(container.querySelector(itemSelector), 'The loaded place must appear in the gallery');
  await act(async () => Simulate.click(container.querySelector(itemSelector)));
  await act(async () => Simulate.click(buttonByText(container, 'DELETE')));
  await act(async () => Simulate.click(buttonByText(container, 'Delete')));
  assert.equal(requests.filter(([, method]) => method === 'DELETE').length, 1,
    'Deletion confirmation must send exactly one DELETE request');
  assert.equal(Boolean(container.querySelector(itemSelector)), false,
    'After a successful DELETE response, the home feed must remove the deleted place');
  assert.equal(Boolean(container.querySelector('[role="dialog"]')), false,
    'Deleting the selected place must also close its preview');
});

test('deleting a nearby place also removes it from the unfiltered home feed', async t => {
  const container = await mount(t, Places);
  await act(async () => window.dispatchEvent(new window.Event('snapit:find-nearby')));
  await act(async () => Simulate.click(container.querySelector('[data-test-tile="place-place1"]')));
  await act(async () => Simulate.click(buttonByText(container, 'DELETE')));
  await act(async () => Simulate.click(buttonByText(container, 'Delete')));
  assert.equal(Boolean(container.querySelector('[data-test-tile="place-place1"]')), false);
  await act(async () => window.dispatchEvent(new window.Event('snapit:find-nearby')));
  assert.equal(Boolean(container.querySelector('[data-test-tile="place-place1"]')), false,
    'Switching back to all places must not restore a deleted place');
});

test('deleting from the dedicated nearby page removes the selected place', async t => {
  const container = await mount(t, NearbyPlaces, '/near-me');
  await act(async () => Simulate.click(buttonByText(container, 'FIND NEAR ME')));
  await act(async () => Simulate.click(container.querySelector('[data-test-tile="place-place1"]')));
  await act(async () => Simulate.click(buttonByText(container, 'DELETE')));
  await act(async () => Simulate.click(buttonByText(container, 'Delete')));
  assert.equal(Boolean(container.querySelector('[data-test-tile="place-place1"]')), false);
  assert.equal(Boolean(container.querySelector('[role="dialog"]')), false);
});

test('a shared place anchor opens its preview and closing it stays closed', async t => {
  const items = [place];
  const SharedPlaces = () => {
    const [searchTerm, setSearchTerm] = React.useState('unrelated search');
    return React.createElement(PlaceSearchContext.Provider, { value: { searchTerm, setSearchTerm } },
      React.createElement(PlaceList, { items, includeTripFeed: false }));
  };
  const container = await mount(t, SharedPlaces, '/user1/places#place-place1');
  assert.ok(container.querySelector('#place-place1'), 'The shared place must open despite an existing search filter');
  await act(async () => Simulate.click(container.querySelector('[aria-label="Close post details"]')));
  assert.equal(Boolean(container.querySelector('[role="dialog"]')), false,
    'Closing the shared preview must not immediately reopen it');
  assert.ok(container.querySelector('[data-test-tile="place-place1"]'), 'The shared place remains in the gallery');
});

test('an unknown or malformed shared anchor leaves the gallery usable', async t => {
  const SharedPlaces = () => React.createElement(PlaceList, { items: [place], includeTripFeed: false });
  const container = await mount(t, SharedPlaces, '/user1/places#place-%zz');
  assert.equal(Boolean(container.querySelector('[role="dialog"]')), false);
  assert.ok(container.querySelector('[data-test-tile="place-place1"]'));
});

test('the trip shortcut appears only for a signed-in active trip and opens that trip', async t => {
  let setTrip;
  let setSignedIn;
  const Shortcut = () => {
    const [activeTrip, updateTrip] = React.useState(null);
    const [isLoggedIn, updateSignedIn] = React.useState(true);
    setTrip = updateTrip;
    setSignedIn = updateSignedIn;
    return React.createElement(AuthContext.Provider, { value: { ...auth, isLoggedIn } },
      React.createElement(TripContext.Provider, { value: { activeTrip, isLoading: false } },
        React.createElement(ActiveTripLink)));
  };
  const container = await mount(t, Shortcut);
  assert.equal(container.querySelector('a'), null);
  for (const status of ['draft', 'completed', 'published']) {
    await act(async () => setTrip({ id: 'trip1', status }));
    assert.equal(container.querySelector('a'), null, `${status} must not show the shortcut`);
  }
  await act(async () => setTrip({ _id: 'trip1', status: 'active' }));
  assert.equal(container.querySelector('a').getAttribute('href'), '/trips/trip1');
  assert.match(container.textContent, /Trip in progress/);
  await act(async () => setSignedIn(false));
  assert.equal(container.querySelector('a'), null);
  await act(async () => { setSignedIn(true); setTrip(null); });
  assert.equal(container.querySelector('a'), null, 'Stopping the trip hides the shortcut');
});

const sessionToken = expires => `header.${Buffer.from(JSON.stringify({ exp: expires })).toString('base64url')}.signature`;

test('session expiry follows the JWT, cannot be extended by storage, and rejects corrupt tokens', () => {
  const expires = Math.floor(Date.now() / 1000) + 120;
  const token = sessionToken(expires);
  assert.equal(getSessionExpiration(token).getTime(), expires * 1000);
  assert.equal(getSessionExpiration(token, new Date((expires + 3600) * 1000)).getTime(), expires * 1000);
  assert.equal(getSessionExpiration(token, new Date((expires - 60) * 1000)).getTime(), (expires - 60) * 1000);
  for (const value of [null, 'bad', 'x.e30.x']) assert.equal(getSessionExpiration(value), null);
  assert.equal(getSessionExpiration(token, 'bad date'), null);
});

test('only authenticated session rejections trigger expiry; failed login and permission errors do not', () => {
  let expirations = 0;
  const listener = () => { expirations++; };
  window.addEventListener('snapit:session-expired', listener);
  try {
    notifySessionRejected({ status: 401 });
    notifySessionRejected({ status: 403 }, { Authorization: 'Bearer null' }, { message: 'Authentication failed' });
    notifySessionRejected({ status: 403 }, { Authorization: 'Bearer token' }, { message: 'Not your place' });
    assert.equal(expirations, 0);
    notifySessionRejected({ status: 403 }, { Authorization: 'Bearer token' }, { message: 'Authentication failed' });
    notifySessionRejected({ status: 401 }, { Authorization: 'Bearer token' });
    assert.equal(expirations, 2);
  } finally { window.removeEventListener('snapit:session-expired', listener); }
});

async function mountSession(t, saved) {
  window.localStorage.clear();
  if (saved !== undefined) window.localStorage.setItem('userData', typeof saved === 'string' ? saved : JSON.stringify(saved));
  const timers = new Map();
  const navigations = [];
  let timerId = 0;
  const sessionWindow = {
    localStorage: window.localStorage,
    location: { replace: destination => navigations.push(destination) },
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    addEventListener: window.addEventListener.bind(window),
    removeEventListener: window.removeEventListener.bind(window),
  };
  const filename = path.join(sourceRoot, 'shared/hooks/auth-hook.js');
  const compiled = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    configFile: false, babelrc: false,
    presets: [[frontendRequire.resolve('@babel/preset-env'), { targets: { node: 'current' } }]]
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, window: sessionWindow, document, Date,
    require: name => name === 'react' ? React : { getSessionExpiration },
  }, { filename });
  let session;
  const Probe = () => { session = module.exports.CheckAuth(); return null; };
  await mount(t, Probe);
  t.after(() => window.localStorage.clear());
  return { timers, navigations, get session() { return session; } };
}

test('an open session expires once, clears credentials and fully navigates to All places', async t => {
  const expires = Math.floor(Date.now() / 1000) + 120;
  const saved = { userId: 'user1', token: sessionToken(expires), expirationDate: new Date((expires + 3600) * 1000).toISOString() };
  const harness = await mountSession(t, saved);
  assert.equal(harness.session.token, saved.token);
  assert.equal(harness.session.isAuthReady, true);
  assert.equal(harness.timers.size, 1);
  const timer = [...harness.timers.values()][0];
  assert.ok(timer.delay > 0 && timer.delay <= 120000, 'Restoring must not restart a full-hour timer');
  await act(async () => { timer.callback(); timer.callback(); });
  assert.equal(harness.session.token, null);
  assert.equal(window.localStorage.getItem('userData'), null);
  assert.deepEqual(harness.navigations, ['/']);
  assert.equal(harness.timers.size, 0);
});

test('expired and corrupt stored sessions reload All places without restoring authentication', async t => {
  for (const saved of [
    { userId: 'user1', token: sessionToken(Math.floor(Date.now() / 1000) - 1), expirationDate: new Date(Date.now() + 3600000).toISOString() },
    '{broken json',
  ]) {
    const harness = await mountSession(t, saved);
    assert.equal(harness.session.token, null);
    assert.equal(window.localStorage.getItem('userData'), null);
    assert.deepEqual(harness.navigations, ['/']);
  }
});

test('a backend session rejection redirects once and manual logout cancels the expiry timer', async t => {
  const saved = { userId: 'user1', token: sessionToken(Math.floor(Date.now() / 1000) + 120) };
  const harness = await mountSession(t, saved);
  await act(async () => {
    window.dispatchEvent(new window.Event('snapit:session-expired'));
    window.dispatchEvent(new window.Event('snapit:session-expired'));
  });
  assert.deepEqual(harness.navigations, ['/']);
  assert.equal(harness.session.token, null);
  const manual = await mountSession(t, saved);
  await act(async () => manual.session.logout());
  assert.equal(manual.timers.size, 0);
  assert.deepEqual(manual.navigations, [], 'Manual logout does not run a later expiry reload');
});

after(() => {
  Module._load = originalModuleLoad;
  require.extensions['.js'] = originalJsLoader;
  if (originalCssLoader) require.extensions['.css'] = originalCssLoader;
  else delete require.extensions['.css'];
  dom.window.close();
});
