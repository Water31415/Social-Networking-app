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
global.localStorage = dom.window.localStorage;
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

let requestOverride = null;
const sendRequest = async (...args) => {
  requests.push(args);
  if (requestOverride) return requestOverride(...args);
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
      return { LoadingText: () => null, MorphSlider: () => null, PulseHeart: () => null, Masonry: SimpleMasonry, PlaceServiceBoard: () => null, ShinyText: props => React.createElement('span', null, props.text), TripMap: () => null, TripItineraryEditor: require(path.join(sourceRoot, 'shared/components/UI/TripItineraryEditor/TripItineraryEditor.js')).default };
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

const { MemoryRouter, Route } = frontendRequire('react-router-dom');
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
const { ThemeProvider, THEME_STORAGE_KEY } = require(path.join(sourceRoot, 'shared/components/context/theme-context.js'));
const ThemeToggle = require(path.join(sourceRoot, 'shared/components/Navigation/ThemeToggle.js')).default;
const AchievementCollection = require(path.join(sourceRoot, 'user/components/AchievementCollection.js')).default;
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

const change = (container, selector, value) => {
  const input = container.querySelector(selector);
  Simulate.change(input, { target:{ name:input.name, value } });
};
const buttonByText = (container, label) => [...container.querySelectorAll('button')]
  .find(button => button.textContent === label);

test('production API URLs use the deployment origin and support an explicit separate backend', () => {
  const source = fs.readFileSync(path.join(sourceRoot, 'shared/Utils/backend-url.js'), 'utf8').replace(/^export /gm, '');
  const helpers = env => {
    const context = vm.createContext({ process:{ env } });
    vm.runInContext(source, context);
    return vm.runInContext('({ backendUrl, backendImageUrl })', context);
  };
  assert.equal(helpers({ NODE_ENV:'development' }).backendUrl('/api/places'), 'http://localhost:5000/api/places');
  const production = helpers({ NODE_ENV:'production' });
  assert.equal(production.backendUrl('api/users/me/saved'), '/api/users/me/saved');
  assert.equal(production.backendImageUrl('/uploads/images/photo.png'), '/uploads/images/photo.png');
  assert.equal(helpers({ NODE_ENV:'production', REACT_APP_BACKEND_URL:'https://api.example.invalid/' }).backendUrl('/api/places'), 'https://api.example.invalid/api/places');
});

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

async function mountSession(t, saved, { storage } = {}) {
  window.localStorage.clear();
  if (saved !== undefined) window.localStorage.setItem('userData', typeof saved === 'string' ? saved : JSON.stringify(saved));
  const timers = new Map();
  const navigations = [];
  let timerId = 0;
  const sessionWindow = {
    localStorage: storage || window.localStorage,
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

test('a delayed rejection from an old token cannot log out a new session', async t => {
  const token = sessionToken(Math.floor(Date.now() / 1000) + 120);
  const harness = await mountSession(t, { userId: 'user1', token });
  await act(async () => notifySessionRejected({ status: 401 }, { Authorization: 'Bearer old-token' }));
  assert.equal(harness.session.token, token);
  assert.deepEqual(harness.navigations, []);
  await act(async () => notifySessionRejected({ status: 401 }, { Authorization: `Bearer ${token}` }));
  assert.equal(harness.session.token, null);
  assert.deepEqual(harness.navigations, ['/']);
});

function installThemeEnvironment(t, light = false) {
  const originalMatchMedia = window.matchMedia;
  const listeners = new Set();
  const media = {
    matches: light,
    addEventListener: (type, listener) => listeners.add(listener),
    removeEventListener: (type, listener) => listeners.delete(listener),
  };
  window.matchMedia = () => media;
  window.localStorage.clear();
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  document.head.appendChild(meta);
  t.after(() => {
    window.matchMedia = originalMatchMedia;
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    meta.remove();
  });
  return { listeners, meta, change: value => {
    media.matches = value;
    listeners.forEach(listener => listener({ matches: value }));
  } };
}

const ThemeControl = () => React.createElement(ThemeProvider, null, React.createElement(ThemeToggle));

test('theme toggle overrides the system preference, persists on remount and updates browser chrome', async t => {
  const environment = installThemeEnvironment(t, true);
  window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
  const container = await mount(t, ThemeControl);
  const control = container.querySelector('[role="switch"]');
  assert.equal(control.getAttribute('aria-checked'), 'true');
  assert.equal(document.documentElement.dataset.theme, 'dark');
  await act(async () => Simulate.click(control));
  assert.equal(document.documentElement.dataset.theme, 'light');
  assert.equal(control.getAttribute('aria-checked'), 'false');
  assert.equal(window.localStorage.getItem(THEME_STORAGE_KEY), 'light');
  assert.equal(environment.meta.content, '#f5f1e8');
  const restored = await mount(t, ThemeControl);
  assert.equal(restored.querySelector('[role="switch"]').getAttribute('aria-checked'), 'false');
});

test('system theme changes apply until an explicit choice is made, and other tabs synchronize', async t => {
  const environment = installThemeEnvironment(t);
  const container = await mount(t, ThemeControl);
  assert.equal(document.documentElement.dataset.theme, 'dark');
  await act(async () => environment.change(true));
  assert.equal(document.documentElement.dataset.theme, 'light');
  assert.equal(window.localStorage.getItem(THEME_STORAGE_KEY), null, 'Following the system must not save an override');
  await act(async () => Simulate.click(container.querySelector('[role="switch"]')));
  await act(async () => environment.change(true));
  assert.equal(document.documentElement.dataset.theme, 'dark', 'An explicit choice survives system changes');
  await act(async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    window.dispatchEvent(new window.StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'light' }));
  });
  assert.equal(document.documentElement.dataset.theme, 'light');
});

test('theme bootstrap paints the saved preference and still works when storage is blocked', () => {
  const source = fs.readFileSync(path.join(frontendRoot, 'public/theme-init.js'), 'utf8');
  for (const [saved, systemLight, expected] of [['dark', true, 'dark'], ['light', false, 'light'], ['invalid', true, 'light'], [null, false, 'dark']]) {
    let selected;
    vm.runInNewContext(source, {
      window: { localStorage: { getItem: () => saved }, matchMedia: () => ({ matches: systemLight }) },
      document: { documentElement: { setAttribute: (_, theme) => { selected = theme; } }, querySelector: () => null },
    });
    assert.equal(selected, expected);
  }
  let selected;
  vm.runInNewContext(source, {
    window: { get localStorage() { throw new Error('Storage is blocked'); }, matchMedia: () => ({ matches: true }) },
    document: { documentElement: { setAttribute: (_, theme) => { selected = theme; } }, querySelector: () => null },
  });
  assert.equal(selected, 'light');
});

test('achievement filters preserve real milestone counts, show progress and allow keyboard flipping', async t => {
  const analytics = { places: 3, likesReceived: 17, commentsReceived: 2, sharesReceived: 0, badges: [
    { id: 'first-place', label: 'First Place', description: 'Shared your first place', earned: true },
    { id: 'explorer', label: 'Explorer', description: 'Shared 5 places', earned: false },
    { id: 'popular', label: 'Crowd Favorite', description: 'Received 10 likes', earned: true },
  ] };
  const Collection = () => React.createElement(AchievementCollection, { analytics });
  const container = await mount(t, Collection);
  assert.equal(container.querySelectorAll('.milestone-card').length, 3);
  const fronts = [...container.querySelectorAll('.flip-card__face--front')];
  assert.deepEqual(fronts.map(front => front.querySelector('img').getAttribute('alt')), ['Ace of spades', 'Ten of spades', 'Jack of spades']);
  for (const front of fronts) {
    assert.equal(front.textContent, '', 'Fronts show only the supplied playing-card artwork');
    assert.equal(front.querySelector('h3, [role="progressbar"], .milestone-body, .milestone-stamp'), null);
  }
  assert.equal(container.querySelector('.achievement-summary [role="progressbar"]').getAttribute('aria-valuenow'), '2');
  const explorer = container.querySelector('[aria-label="Explorer: places shared"]');
  assert.equal(explorer.getAttribute('aria-valuenow'), '3');
  assert.equal(explorer.getAttribute('aria-valuemax'), '5');
  const popular = container.querySelector('[aria-label="Crowd Favorite: likes received"]');
  assert.equal(popular.getAttribute('aria-valuenow'), '10', 'Progress is capped at its target');
  const filter = label => [...container.querySelectorAll('.achievement-filters button')].find(button => button.textContent.startsWith(label));
  await act(async () => Simulate.click(filter('Collected')));
  assert.equal(container.querySelectorAll('.milestone-card').length, 2);
  assert.equal(filter('Collected').getAttribute('aria-pressed'), 'true');
  await act(async () => Simulate.click(filter('To discover')));
  const card = container.querySelector('.milestone-card');
  assert.equal(container.querySelectorAll('.milestone-card').length, 1);
  assert.match(card.getAttribute('aria-label'), /Explorer/);
  assert.equal(card.querySelector('img').getAttribute('alt'), 'Ten of spades', 'Filtering keeps each milestone assigned to the same card');
  await act(async () => Simulate.keyDown(card, { key: 'Enter' }));
  assert.equal(card.getAttribute('data-flipped'), 'true');
  assert.equal(card.querySelector('.flip-card__face--back').getAttribute('aria-hidden'), 'false');
  assert.match(card.querySelector('.flip-card__face--back').textContent, /Explorer.*Shared 5 places/);
});

test('achievement filters provide helpful empty states', async t => {
  const Collection = () => React.createElement(AchievementCollection, { analytics: { places: 0, badges: [
    { id: 'first-place', label: 'First Place', description: 'Shared your first place', earned: false },
  ] } });
  const container = await mount(t, Collection);
  const filter = [...container.querySelectorAll('.achievement-filters button')].find(button => button.textContent.startsWith('Collected'));
  await act(async () => Simulate.click(filter));
  assert.equal(container.querySelectorAll('.milestone-card').length, 0);
  assert.match(container.querySelector('.achievement-section__empty').textContent, /Share a moment/);
});

test('next-card strip chooses the closest unfinished goal and handles a complete deck', async t => {
  let setAnalytics;
  const badges = [{ id:'first-place', label:'First Place', earned:true }, { id:'explorer', label:'Explorer', earned:false }, { id:'popular', label:'Crowd Favorite', earned:false }];
  const Probe = () => {
    const [analytics, update] = React.useState({ places:3, likesReceived:9, badges });
    setAnalytics = update;
    return React.createElement(AchievementCollection, { analytics });
  };
  const container = await mount(t, Probe);
  const next = container.querySelector('[aria-label="Next card to unlock"]');
  assert.match(next.textContent, /Crowd Favorite.*1 more like/);
  assert.equal(next.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'), '9');
  assert.equal(next.closest('.milestone-card'), null);
  await act(async () => setAnalytics({ places:5, likesReceived:10, badges:badges.map(badge => ({ ...badge, earned:true })) }));
  assert.match(container.querySelector('.achievement-next--complete').textContent, /deck is complete/);
});

test('newly earned cards reveal once per account and preserve image-only front faces', async t => {
  const key = 'snapit:revealed-milestones:user1';
  window.localStorage.setItem(key, '[]');
  t.after(() => window.localStorage.removeItem(key));
  const analytics = { places:1, badges:[{ id:'first-place', label:'First Place', earned:true }] };
  const Probe = () => React.createElement(AchievementCollection, { analytics });
  const first = await mount(t, Probe);
  assert.ok(first.querySelector('.is-unlocking'));
  assert.match(first.querySelector('.achievement-unlock').textContent, /First Place.*Ace/);
  assert.equal(first.querySelector('.flip-card__face--front').textContent, '');
  const second = await mount(t, Probe);
  assert.equal(second.querySelector('.is-unlocking'), null, 'Returning must not replay an acknowledged card');
});

test('existing milestones do not animate on a first visit and progress changes reveal new cards', async t => {
  const key = 'snapit:revealed-milestones:user1';
  window.localStorage.removeItem(key);
  t.after(() => window.localStorage.removeItem(key));
  let update;
  const badges = [{ id:'first-place', label:'First Place', earned:true }, { id:'explorer', label:'Explorer', earned:false }];
  const Probe = () => {
    const [analytics, set] = React.useState({ places:1, badges }); update = set;
    return React.createElement(AchievementCollection, { analytics });
  };
  const container = await mount(t, Probe);
  assert.equal(container.querySelector('.is-unlocking'), null);
  await act(async () => update({ places:5, badges:badges.map(badge => ({ ...badge, earned:true })) }));
  assert.equal(container.querySelectorAll('.is-unlocking').length, 1);
  assert.match(container.querySelector('.is-unlocking').getAttribute('aria-label'), /Explorer/);
});

test('saved-place state persists successful changes and keeps data intact on failed saves', async t => {
  const { SavedPlacesProvider, useSavedPlaces } = require(path.join(sourceRoot, 'shared/components/context/saved-places-context.js'));
  let library;
  let rejectSave = false;
  requestOverride = async (url, method = 'GET', body) => {
    if (method === 'GET') return { collections:[{ id:'collection1', name:'Weekend' }], savedPlaces:[] };
    if (method === 'PUT') { if (rejectSave) throw new Error('Offline'); return { collectionId:JSON.parse(body).collectionId, savedAt:'2026-11-13T10:00:00Z' }; }
    return null;
  };
  t.after(() => { requestOverride = null; });
  const Probe = () => { library = useSavedPlaces(); return null; };
  await mount(t, () => React.createElement(SavedPlacesProvider, null, React.createElement(Probe)));
  await act(async () => library.savePlace(place, 'collection1'));
  assert.equal(library.savedPlaces.length, 1);
  assert.equal(library.getSavedPlace(place.id).collectionId, 'collection1');
  rejectSave = true;
  await act(async () => assert.rejects(library.savePlace({ ...place, id:'other' }), /Offline/));
  assert.equal(library.savedPlaces.length, 1);
  await act(async () => library.deleteCollection('collection1'));
  assert.equal(library.collections.length, 0);
  assert.equal(library.getSavedPlace(place.id), null);
  rejectSave = false;
  await act(async () => library.savePlace(place));
  assert.equal(library.getSavedPlace(place.id).collectionId, null);
  await act(async () => library.removePlace(place.id));
  assert.equal(library.savedPlaces.length, 0);
});

test('removing a collection unsaves its places, updates counts, and retains everything on failure', async t => {
  const { SavedPlacesProvider, useSavedPlaces } = require(path.join(sourceRoot, 'shared/components/context/saved-places-context.js'));
  const SavedPlaces = require(path.join(sourceRoot, 'places/pages/SavedPlaces.js')).default;
  let library, rejectDelete = true;
  const kept = { ...place, id:'kept', title:'Another collection' };
  const unsorted = { ...place, id:'unsorted', title:'Unsorted place' };
  requestOverride = async (url, method = 'GET') => {
    if (method === 'DELETE') { if (rejectDelete) throw new Error('Offline'); return null; }
    return {
      collections:[{ id:'collection1', name:'Weekend' }, { id:'collection2', name:'Next trip' }],
      savedPlaces:[
        { place, collectionId:'collection1' },
        { place:{ ...place, id:'second' }, collectionId:'collection1' },
        { place:kept, collectionId:'collection2' },
        { place:unsorted, collectionId:null }
      ]
    };
  };
  t.after(() => { requestOverride = null; });
  const Probe = () => { library = useSavedPlaces(); return React.createElement(SavedPlaces); };
  const container = await mount(t, () => React.createElement(SavedPlacesProvider, null, React.createElement(Probe)), '/saved');
  const weekend = [...container.querySelectorAll('.saved-collections nav button')].find(button => button.textContent.includes('Weekend'));
  await act(async () => Simulate.click(weekend));
  await act(async () => Simulate.click(buttonByText(container, 'Remove collection')));
  assert.match(container.querySelector('[role="dialog"] p').textContent, /also be removed from your saved places/);
  await act(async () => Simulate.click(buttonByText(container.querySelector('[role="dialog"]'), 'Remove collection')));
  assert.equal(library.savedPlaces.length, 4);
  assert.equal(library.collections.length, 2);
  assert.match(container.querySelector('[role="dialog"] [role="alert"]').textContent, /Offline/);
  rejectDelete = false;
  await act(async () => Simulate.click(buttonByText(container.querySelector('[role="dialog"]'), 'Remove collection')));
  assert.equal(container.querySelector('[role="dialog"]'), null);
  assert.equal(container.querySelector('[role="alert"]'), null);
  assert.equal(container.querySelector('.saved-page__collection-heading h2').textContent, 'All saved places');
  assert.equal(container.querySelector('.saved-page__total strong').textContent, '2');
  assert.equal(container.querySelector('.saved-collections nav button small').textContent, '2');
  assert.equal(library.getSavedPlace(place.id), null);
  assert.equal(library.getSavedPlace('second'), null);
  assert.equal(library.getSavedPlace(kept.id).collectionId, 'collection2');
  assert.equal(library.getSavedPlace(unsorted.id).collectionId, null);
  assert.deepEqual(library.collections.map(collection => collection.id), ['collection2']);
});

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

test('editing a bookmarked place updates its saved details without a reload', async t => {
  const { SavedPlacesProvider, useSavedPlaces } = require(path.join(sourceRoot, 'shared/components/context/saved-places-context.js'));
  let library;
  requestOverride = async (url, method = 'GET') => url.includes('/me/saved')
    ? { collections:[], savedPlaces:[{ place:{ ...place }, collectionId:null, savedAt:'2026-01-01' }] }
    : { place:method === 'PATCH' ? { ...place, title:'Updated saved title' } : place };
  t.after(() => { requestOverride = null; });
  const Probe = () => { library = useSavedPlaces(); return React.createElement(UpdatePlace); };
  const container = await mount(t, () => React.createElement(SavedPlacesProvider, null, React.createElement(Probe)));
  await act(async () => change(container, '#title', 'Updated saved title'));
  await act(async () => Simulate.submit(container.querySelector('form')));
  assert.equal(library.getSavedPlace(place.id).place.title, 'Updated saved title');
});

test('deleting a place from Explore immediately removes its cached bookmark', async t => {
  const { SavedPlacesProvider, useSavedPlaces } = require(path.join(sourceRoot, 'shared/components/context/saved-places-context.js'));
  let library;
  requestOverride = async url => url.includes('/me/saved')
    ? { collections:[], savedPlaces:[{ place:{ ...place }, collectionId:null, savedAt:'2026-01-01' }] }
    : { places:[place] };
  t.after(() => { requestOverride = null; });
  const Probe = () => { library = useSavedPlaces(); return React.createElement(Places); };
  const container = await mount(t, () => React.createElement(SavedPlacesProvider, null, React.createElement(Probe)));
  await act(async () => Simulate.click(container.querySelector('[data-test-tile="place-place1"]')));
  await act(async () => Simulate.click(buttonByText(container, 'DELETE')));
  await act(async () => Simulate.click(buttonByText(container, 'Delete')));
  assert.equal(library.getSavedPlace(place.id), null);
});

test('callbacks from an ended session cannot send another saved-place mutation', async t => {
  const { SavedPlacesProvider, useSavedPlaces } = require(path.join(sourceRoot, 'shared/components/context/saved-places-context.js'));
  let library, hide;
  requestOverride = async () => ({ collections:[], savedPlaces:[] });
  t.after(() => { requestOverride = null; });
  const Probe = () => { library = useSavedPlaces(); return null; };
  const Harness = () => { const [visible, setVisible] = React.useState(true); hide = () => setVisible(false); return visible ? React.createElement(SavedPlacesProvider, null, React.createElement(Probe)) : null; };
  await mount(t, Harness);
  const staleSave = library.savePlace;
  await act(async () => hide());
  const before = requests.length;
  await act(async () => assert.rejects(staleSave(place), error => error.name === 'AbortError'));
  assert.equal(requests.length, before);
});

test('the dashboard ignores an older initial load after fresh analytics arrive', async t => {
  const Dashboard = require(path.join(sourceRoot, 'user/pages/Dashboard.js')).default;
  const initial = deferred();
  const badge = { id:'first-place', label:'First Place', earned:true };
  requestOverride = async url => url.includes('/analytics') ? initial.promise : { place:[] };
  t.after(() => { requestOverride = null; });
  const container = await mount(t, Dashboard);
  await act(async () => window.dispatchEvent(new window.CustomEvent('snapit:analytics-updated', { detail:{ userId:auth.userId, analytics:{ places:4, badges:[badge] } } })));
  await act(async () => initial.resolve({ places:1, badges:[badge] }));
  assert.equal(container.querySelector('.analytics-card__value-row strong').textContent, '4');
});

test('saved-place conflicts refresh deleted collections before the next attempt', async t => {
  const { SavedPlacesProvider, useSavedPlaces } = require(path.join(sourceRoot, 'shared/components/context/saved-places-context.js'));
  let library, reads = 0;
  requestOverride = async (url, method = 'GET') => {
    if (method === 'GET') return { collections:++reads === 1 ? [{ id:'old', name:'Old collection' }] : [], savedPlaces:[] };
    throw Object.assign(new Error('Collection not found'), { status:404 });
  };
  t.after(() => { requestOverride = null; });
  const Probe = () => { library = useSavedPlaces(); return null; };
  await mount(t, () => React.createElement(SavedPlacesProvider, null, React.createElement(Probe)));
  await act(async () => assert.rejects(library.savePlace(place, 'old'), /Collection not found/));
  assert.equal(library.collections.length, 0);
  assert.equal(library.isBusy, false);
});

test('an older analytics poll cannot replace a newer result', async t => {
  const visibility = Object.getOwnPropertyDescriptor(document, 'hidden');
  Object.defineProperty(document, 'hidden', { configurable:true, get:() => false });
  t.after(() => { if (visibility) Object.defineProperty(document, 'hidden', visibility); else delete document.hidden; });
  const portal = document.createElement('div'); portal.id = 'drawer-hook'; document.body.appendChild(portal);
  t.after(() => portal.remove());
  const MainNavigation = require(path.join(sourceRoot, 'shared/components/Navigation/MainNavigation.js')).default;
  const pending = [], events = [];
  requestOverride = () => { const call = deferred(); pending.push(call); return call.promise; };
  const listener = event => { if (event.detail.userId === 'nav-user') events.push(event.detail.analytics.places); };
  window.addEventListener('snapit:analytics-updated', listener);
  t.after(() => { requestOverride = null; window.removeEventListener('snapit:analytics-updated', listener); window.localStorage.removeItem('snapit:revealed-milestones:nav-user'); window.localStorage.removeItem('snapit:seen-milestones:nav-user'); });
  const Probe = () => React.createElement(AuthContext.Provider, { value:{ ...auth, userId:'nav-user' } }, React.createElement(ThemeProvider, null, React.createElement(MainNavigation)));
  await mount(t, Probe);
  await act(async () => window.dispatchEvent(new window.Event('focus')));
  assert.equal(pending.length, 2);
  await act(async () => pending[1].resolve({ places:5, badges:[] }));
  await act(async () => pending[0].resolve({ places:3, badges:[] }));
  assert.deepEqual(events, [5]);
});

test('saved-page refreshes are deduplicated and preserve an open preview on network failure', async t => {
  const { SavedPlacesProvider, useSavedPlaces } = require(path.join(sourceRoot, 'shared/components/context/saved-places-context.js'));
  const SavedPlaces = require(path.join(sourceRoot, 'places/pages/SavedPlaces.js')).default;
  let library, reads = 0, pending = null;
  requestOverride = async () => { reads++; return pending ? pending.promise : { collections:[], savedPlaces:[{ place:{ ...place }, savedAt:'2026-01-01', collectionId:null }] }; };
  t.after(() => { requestOverride = null; });
  const Probe = () => { library = useSavedPlaces(); return React.createElement(SavedPlaces); };
  const container = await mount(t, () => React.createElement(SavedPlacesProvider, null, React.createElement(Probe)));
  assert.equal(reads, 1, 'The page and provider must share their initial read');
  await act(async () => Simulate.click(container.querySelector('[data-test-tile="place-place1"]')));
  assert.ok(container.querySelector('#place-place1'));
  pending = deferred();
  let refreshing;
  await act(async () => { refreshing = library.refresh(); library.refresh(); });
  assert.equal(reads, 2);
  assert.equal(library.isLoading, false, 'Background refreshes should not replace loaded content');
  assert.ok(container.querySelector('#place-place1'));
  await act(async () => { pending.reject(new Error('Offline')); await refreshing; });
  assert.ok(container.querySelector('#place-place1'), 'The cached preview must remain usable');
  assert.match(container.querySelector('.saved-page__error').textContent, /Offline/);
});

test('a collection removed in another tab closes its stale rename form safely', async t => {
  const SavedPlacesContext = require(path.join(sourceRoot, 'shared/components/context/saved-places-context.js')).default;
  const SavedPlaces = require(path.join(sourceRoot, 'places/pages/SavedPlaces.js')).default;
  let update;
  const initial = { collections:[{ id:'collection1', name:'Weekend' }], savedPlaces:[], isLoading:false, isBusy:false, loadError:'', refresh:async () => {} };
  const Probe = () => {
    const [value, setValue] = React.useState(initial); update = setValue;
    return React.createElement(SavedPlacesContext.Provider, { value }, React.createElement(SavedPlaces));
  };
  const container = await mount(t, Probe);
  await act(async () => Simulate.click(container.querySelector('.saved-collections nav button:last-child')));
  await act(async () => Simulate.click(buttonByText(container, 'Rename')));
  assert.ok(container.querySelector('.saved-collection-form'));
  await act(async () => update({ ...initial, collections:[] }));
  assert.equal(container.querySelector('.saved-collection-form'), null);
  assert.match(container.querySelector('[role="alert"]').textContent, /no longer available/);
});

test('a deleted collection is automatically replaced by Unsorted in an open save picker', async t => {
  const SavedPlacesContext = require(path.join(sourceRoot, 'shared/components/context/saved-places-context.js')).default;
  const SavePlaceButton = require(path.join(sourceRoot, 'places/components/SavePlaceButton.js')).default;
  let update;
  const initial = { collections:[{ id:'old', name:'Weekend' }], isLoading:false, isBusy:false, loadError:'', getSavedPlace:() => ({ collectionId:'old' }) };
  const Probe = () => { const [value, setValue] = React.useState(initial); update = setValue; return React.createElement(SavedPlacesContext.Provider, { value }, React.createElement(SavePlaceButton, { place })); };
  const container = await mount(t, Probe);
  await act(async () => Simulate.click(container.querySelector('[aria-label="Manage saved place"]')));
  assert.equal(container.querySelector('input[value="old"]').checked, true);
  await act(async () => update({ ...initial, collections:[] }));
  assert.equal(container.querySelector('input[value=""]').checked, true);
});

test('a pending collection creation cannot continue saving into a newer session', async t => {
  const { SavedPlacesProvider, useSavedPlaces } = require(path.join(sourceRoot, 'shared/components/context/saved-places-context.js'));
  const pending = deferred();
  let library, changeSession;
  requestOverride = async (url, method = 'GET') => method === 'POST' ? pending.promise : { collections:[], savedPlaces:[] };
  t.after(() => { requestOverride = null; });
  const Probe = () => { library = useSavedPlaces(); return null; };
  const Harness = () => { const [session, setSession] = React.useState(auth); changeSession = setSession; return React.createElement(AuthContext.Provider, { value:session }, React.createElement(SavedPlacesProvider, null, React.createElement(Probe))); };
  await mount(t, Harness);
  const oldCreate = library.createCollection, oldSave = library.savePlace;
  let rejected;
  await act(async () => { rejected = assert.rejects(oldCreate('Weekend').then(result => oldSave(place, result.collection.id)), error => error.name === 'AbortError'); });
  await act(async () => changeSession({ ...auth, token:'new-session' }));
  await act(async () => { pending.resolve({ collection:{ id:'old', name:'Weekend' } }); await rejected; });
  assert.equal(requests.filter(([, method]) => method === 'PUT').length, 0);
  assert.equal(library.collections.length, 0);
});
const response = data => ({ ok: true, status: 200, json: async () => data });

test('parallel HTTP requests keep loading active until every request settles', async t => {
  const { useHttpClient } = require(path.join(sourceRoot, 'shared/hooks/http-hook.js'));
  const originalFetch = global.fetch;
  const first = deferred(), second = deferred();
  let calls = 0, client, one, two;
  global.fetch = () => (++calls === 1 ? first : second).promise;
  t.after(() => { global.fetch = originalFetch; });
  const Probe = () => { client = useHttpClient(); return null; };
  await mount(t, Probe);
  await act(async () => { one = client.sendRequest('/one'); two = client.sendRequest('/two'); });
  assert.equal(client.isLoading, true);
  await act(async () => { first.resolve(response({ value: 1 })); await one; });
  assert.equal(client.isLoading, true, 'One successful request must not hide another pending request');
  await act(async () => { second.reject(new Error('Network failed')); await assert.rejects(two, /Network failed/); });
  assert.equal(client.isLoading, false);
  assert.equal(client.error, 'Network failed');
});

test('HTTP handles empty success responses and readable errors for malformed responses', async t => {
  const { useHttpClient } = require(path.join(sourceRoot, 'shared/hooks/http-hook.js'));
  const originalFetch = global.fetch;
  let client;
  t.after(() => { global.fetch = originalFetch; });
  const Probe = () => { client = useHttpClient(); return null; };
  await mount(t, Probe);
  global.fetch = async () => ({ ok: true, status: 204 });
  await act(async () => assert.equal(await client.sendRequest('/empty'), null));
  global.fetch = async () => ({ ok: false, status: 502, json: async () => { throw new SyntaxError('HTML response'); } });
  await act(async () => assert.rejects(client.sendRequest('/invalid'), error => error.status === 502 && /unreadable response/.test(error.message)));
  assert.equal(client.isLoading, false);
  global.fetch = async () => ({ ok:false, status:404, json:async () => ({ message:'Collection not found' }) });
  await act(async () => assert.rejects(client.sendRequest('/missing'), error => error.status === 404 && error.message === 'Collection not found'));
});

test('active-trip responses from an old session or before a local update cannot restore stale state', async t => {
  const { TripProvider } = require(path.join(sourceRoot, 'shared/components/context/trip-context.js'));
  const originalFetch = global.fetch;
  const pending = [];
  let context, setSession;
  global.fetch = (_, options) => { const request = deferred(); pending.push({ ...request, signal: options.signal }); return request.promise; };
  t.after(() => { global.fetch = originalFetch; });
  const Probe = () => { context = React.useContext(TripContext); return null; };
  const Harness = () => {
    const [session, changeSession] = React.useState(auth);
    setSession = changeSession;
    return React.createElement(AuthContext.Provider, { value: session }, React.createElement(TripProvider, null, React.createElement(Probe)));
  };
  await mount(t, Harness);
  assert.equal(pending.length, 1);
  await act(async () => setSession({ token: null, isLoggedIn: false }));
  assert.equal(pending[0].signal.aborted, true);
  await act(async () => { pending[0].resolve(response({ trip: { id: 'old-trip', status: 'active' } })); });
  assert.equal(context.activeTrip, null);
  await act(async () => setSession({ ...auth, token: 'new-token' }));
  await act(async () => { pending[1].resolve(response({ trip: { id: 'new-trip', status: 'active' } })); });
  assert.equal(context.activeTrip.id, 'new-trip');
  let refreshing;
  await act(async () => { refreshing = context.refreshActiveTrip(); });
  await act(async () => context.setActiveTrip(null));
  await act(async () => { pending[2].resolve(response({ trip: { id: 'new-trip', status: 'active' } })); await refreshing; });
  assert.equal(context.activeTrip, null, 'An earlier GET must not undo stopping a trip');
});

test('blocked storage does not crash authentication or create a reload loop', async t => {
  const blocked = () => { throw new Error('Storage blocked'); };
  const harness = await mountSession(t, undefined, { storage: { getItem: blocked, setItem: blocked, removeItem: blocked } });
  assert.equal(harness.session.isAuthReady, true);
  assert.deepEqual(harness.navigations, []);
  await act(async () => harness.session.login('user1', sessionToken(Math.floor(Date.now() / 1000) + 120)));
  assert.ok(harness.session.token);
  await act(async () => harness.session.logout());
  assert.equal(harness.session.token, null);
});

test('trip creation recovers malformed draft fields and keeps valid itinerary entries', async t => {
  const StartTrip = require(path.join(sourceRoot, 'trips/pages/StartTrip.js')).default;
  const key = 'snapit-trip-draft-user1';
  window.localStorage.setItem(key, JSON.stringify({ title:42, plannedBudget:{}, visibility:'unknown', startAddress:'Delhi', itinerary:[null, { plannedPlace:{} }, { day:2, plannedPlace:'A forest walk', plannedTime:'10:30', done:false }] }));
  t.after(() => window.localStorage.removeItem(key));
  const container = await mount(t, StartTrip);
  assert.equal(container.querySelector('[name="title"]').value, '');
  assert.equal(container.querySelector('[name="startAddress"]').value, 'Delhi');
  assert.equal(container.querySelector('[name="visibility"]').value, 'private');
  assert.equal(container.querySelector('[name="plannedBudget"]').value, '');
  assert.equal(container.querySelectorAll('.trip-itinerary__row').length, 1);
  assert.equal(container.querySelector('.trip-itinerary__row input[placeholder="Place to visit"]').value, 'A forest walk');
});

const fixtureTrip = { id:'trip1', title:'Weekend trip', status:'active', plannedBudget:100, stops:[], itinerary:[] };
const activeTripPage = () => {
  const ActiveTrip = require(path.join(sourceRoot, 'trips/pages/ActiveTrip.js')).default;
  return React.createElement(TripContext.Provider, { value:{ activeTrip:fixtureTrip, setActiveTrip:noop } },
    React.createElement(Route, { path:'/trips/:tripId' }, React.createElement(ActiveTrip)));
};

test('active trips recover malformed stop drafts without losing valid text and expenses', async t => {
  const key = 'snapit-stop-draft-trip1';
  window.localStorage.setItem(key, JSON.stringify({ form:{ title:[], note:'A quiet afternoon', address:'Delhi' }, expenses:[null, { amount:{}, category:{} }, { amount:'12.50', category:'Food', note:'Lunch' }] }));
  requestOverride = async () => ({ trip:fixtureTrip });
  t.after(() => { window.localStorage.removeItem(key); requestOverride = null; });
  const container = await mount(t, activeTripPage, '/trips/trip1');
  assert.equal(container.querySelector('[name="title"]').value, '');
  assert.equal(container.querySelector('[name="note"]').value, 'A quiet afternoon');
  assert.equal(container.querySelector('[name="address"]').value, 'Delhi');
  assert.match(container.querySelector('.trip-budget-live').textContent, /12\.50/);
  assert.equal(container.querySelectorAll('[aria-label="Expense amount"]')[0].value, '');
  assert.equal(container.querySelectorAll('[aria-label="Expense amount"]')[1].value, '12.50');
});

test('trip creation ignores repeat submissions and allows retry after a failure', async t => {
  const StartTrip = require(path.join(sourceRoot, 'trips/pages/StartTrip.js')).default;
  let pending = deferred();
  requestOverride = () => pending.promise;
  t.after(async () => { await act(async () => pending.resolve({ trip:fixtureTrip })); requestOverride = null; window.localStorage.removeItem('snapit-trip-draft-user1'); });
  const container = await mount(t, StartTrip);
  await act(async () => change(container, '[name="title"]', 'A weekend away'));
  await act(async () => { Simulate.submit(container.querySelector('form')); Simulate.submit(container.querySelector('form')); });
  assert.equal(requests.filter(([, method]) => method === 'POST').length, 1);
  assert.equal(JSON.parse(requests.find(([, method]) => method === 'POST')[2]).title, 'A weekend away');
  await act(async () => pending.reject(new Error('Offline')));
  assert.equal(container.querySelector('button[type="submit"]').disabled, false);
  pending = deferred();
  await act(async () => Simulate.submit(container.querySelector('form')));
  assert.equal(requests.filter(([, method]) => method === 'POST').length, 2);
  await act(async () => pending.resolve({ trip:fixtureTrip }));
});

test('saving a stop ignores repeat submissions and preserves the draft for retry', async t => {
  let pending = deferred();
  const createUrl = URL.createObjectURL, revokeUrl = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:trip-test'; URL.revokeObjectURL = noop;
  requestOverride = async (_, method = 'GET') => method === 'POST' ? pending.promise : { trip:fixtureTrip };
  t.after(async () => { await act(async () => pending.resolve({ trip:fixtureTrip })); URL.createObjectURL = createUrl; URL.revokeObjectURL = revokeUrl; requestOverride = null; window.localStorage.removeItem('snapit-stop-draft-trip1'); });
  const container = await mount(t, activeTripPage, '/trips/trip1');
  await act(async () => {
    change(container, '[name="title"]', 'Waterfall'); change(container, '[name="address"]', 'Delhi');
    Simulate.change(container.querySelector('input[type="file"]'), { target:{ files:[new window.File(['bytes'], 'photo.png', { type:'image/png' })] } });
  });
  await act(async () => { Simulate.submit(container.querySelector('form')); Simulate.submit(container.querySelector('form')); });
  assert.equal(requests.filter(([, method]) => method === 'POST').length, 1);
  assert.equal(requests.find(([, method]) => method === 'POST')[2].get('title'), 'Waterfall');
  assert.equal(container.querySelector('button[type="submit"]').disabled, true);
  await act(async () => pending.reject(new Error('Offline')));
  assert.equal(container.querySelector('[name="title"]').value, 'Waterfall');
  assert.equal(container.querySelectorAll('.trip-photo-preview img').length, 1);
  assert.equal(container.querySelector('button[type="submit"]').disabled, false);
  pending = deferred();
  await act(async () => Simulate.submit(container.querySelector('form')));
  assert.equal(requests.filter(([, method]) => method === 'POST').length, 2);
  await act(async () => pending.resolve({ trip:fixtureTrip }));
  assert.equal(container.querySelector('[name="title"]').value, '');
  assert.equal(container.querySelectorAll('.trip-photo-preview img').length, 0);
});

test('photo previews preserve selection order and ignore obsolete reader callbacks', async t => {
  const ImageUpload = require(path.join(sourceRoot, 'shared/components/FormElements/imageUpload.js')).default;
  const originalReader = global.FileReader;
  const readers = [];
  class FakeReader {
    static LOADING = 1;
    readAsDataURL(file) { this.file = file; this.readyState = 1; readers.push(this); }
    abort() { this.readyState = 2; }
  }
  global.FileReader = FakeReader;
  t.after(() => { global.FileReader = originalReader; });
  const Input = () => React.createElement(ImageUpload, { id: 'photos', multiple: true, onInput: noop });
  const container = await mount(t, Input);
  const input = container.querySelector('input');
  const files = ['a.png', 'b.png'].map(name => new window.File(['bytes'], name, { type: 'image/png' }));
  await act(async () => Simulate.change(input, { target: { files } }));
  const stale = readers[0].onload;
  await act(async () => { readers[1].result = 'data:image/png;base64,Yg=='; readers[1].onload(); readers[0].result = 'data:image/png;base64,YQ=='; readers[0].onload(); });
  assert.deepEqual([...container.querySelectorAll('img')].map(image => image.src), ['data:image/png;base64,YQ==', 'data:image/png;base64,Yg==']);
  await act(async () => Simulate.change(input, { target: { files: [] } }));
  await act(async () => stale());
  assert.equal(container.querySelectorAll('img').length, 0);
});

test('changing translation language ignores older responses', async t => {
  const { TripFeedCard } = require(path.join(sourceRoot, 'trips/components/TripFeed.js'));
  const first = deferred(), second = deferred();
  let calls = 0;
  requestOverride = () => (++calls === 1 ? first : second).promise;
  t.after(() => { requestOverride = null; });
  const Trip = () => React.createElement(TripFeedCard, { trip: { id: 'trip1', title: 'Original trip', stops: [], creator: { name: 'Traveler' } } });
  const container = await mount(t, Trip);
  const select = container.querySelector('[aria-label="Translate trip title"]');
  await act(async () => Simulate.change(select, { target: { value: 'es' } }));
  await act(async () => Simulate.change(select, { target: { value: 'fr' } }));
  await act(async () => second.resolve({ translatedText: 'Latest French title' }));
  await act(async () => first.resolve({ translatedText: 'Obsolete Spanish title' }));
  assert.match(container.querySelector('h2').textContent, /Latest French title/);
  assert.doesNotMatch(container.textContent, /Obsolete Spanish title/);
});

after(() => {
  Module._load = originalModuleLoad;
  require.extensions['.js'] = originalJsLoader;
  if (originalCssLoader) require.extensions['.css'] = originalCssLoader;
  else delete require.extensions['.css'];
  dom.window.close();
});
