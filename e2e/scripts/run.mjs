#!/usr/bin/env node
// Runs the restaurant app's Maestro suites against the isolated E2E backend (delivery-plus:
// `npm run e2e:env:reset`). Same runner design as the customer and driver apps; see e2e/README.md.
//
//   node e2e/scripts/run.mjs --suite smoke|business|all [--build] [--headless]
//
// Env: E2E_API_URL (http://localhost:3100), E2E_WEB_PORT (8085), E2E_CONTROL_PORT (8092),
//      E2E_MANIFEST (../delivery-plus/e2e-seed-manifest.json), MAESTRO_BIN (maestro),
//      E2E_COMPOSE_PROJECT (delivery-plus-e2e)
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const E2E_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIR = resolve(E2E_DIR, '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const suite = option('suite', 'smoke');
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3100';
// Different default ports from the customer (8083/8090) and driver (8084/8091) runners, so all three
// suites can run on one machine. The gateway allows 8085 in development (delivery-plus #124).
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 8085);
const CONTROL_PORT = Number(process.env.E2E_CONTROL_PORT ?? 8092);
const APP_URL = `http://localhost:${WEB_PORT}`;
const CONTROL_URL = `http://localhost:${CONTROL_PORT}`;
const MANIFEST = resolve(process.env.E2E_MANIFEST ?? join(APP_DIR, '..', 'delivery-plus', 'e2e-seed-manifest.json'));
const MAESTRO = process.env.MAESTRO_BIN ?? 'maestro';
const PROJECT = process.env.E2E_COMPOSE_PROJECT ?? 'delivery-plus-e2e';
const WEB_BUILD = join(E2E_DIR, '.web-build');
// Desktop width: the order board is the restaurant's main (web) surface; lanes sit side by side.
const SCREEN_SIZE = process.env.E2E_SCREEN_SIZE ?? '1280x1800';
const ARTIFACTS = join(E2E_DIR, '.artifacts', suite);

const SUITES = {
  smoke: ['smoke/01-restaurant-orders.yaml', 'smoke/02-availability.yaml', 'smoke/03-arabic.yaml'],
  business: ['business/01-kitchen-lifecycle.yaml', 'business/02-menu-editor.yaml', 'business/03-reject-order.yaml'],
  // #34: needs the stack's access tokens at 60 s (JWT_EXPIRES_IN=60s), so it is not part of `all`.
  session: ['session/stay-signed-in.yaml', 'session/sign-out.yaml'],
  // #38: needs EMAIL_VERIFICATION_REQUIRED=true on auth-service (backend #252), so it is not part of `all`.
  verification: ['verification/unverified-sign-in.yaml'],
};
SUITES.all = [...SUITES.smoke, ...SUITES.business];

/** The session suite proves refreshes only with short tokens; refuse a stack that issues long ones. */
const SESSION_MAX_TOKEN_SECONDS = 90;

if (!SUITES[suite]) {
  console.error(`Unknown suite "${suite}". Use one of: ${Object.keys(SUITES).join(', ')}`);
  process.exit(2);
}
if (!existsSync(MANIFEST)) {
  console.error(`No seed manifest at ${MANIFEST}. Run \`npm run e2e:env:reset\` in delivery-plus first.`);
  process.exit(2);
}
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

// ---------------------------------------------------------------------------------------------
// Gateway client used by the control server (customer stand-in, driver fixture, verifications).
// ---------------------------------------------------------------------------------------------

/**
 * fetch reuses pooled keep-alive connections. When the runner is idle longer than the gateway's
 * keep-alive timeout (slow fixtures), the next request can land on a socket the server already closed
 * (UND_ERR_SOCKET, nothing was sent), and fetch retries only idempotent methods. Retry once on exactly
 * that error.
 */
async function fetchRetryingClosedSocket(url, init) {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error?.cause?.code !== 'UND_ERR_SOCKET') throw error;
    return fetch(url, init);
  }
}

async function api(method, path, token, body) {
  const res = await fetchRetryingClosedSocket(API_URL + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return data;
}

/** Fails the session suite unless the stack's access tokens expire within SESSION_MAX_TOKEN_SECONDS. */
async function requireShortAccessTokens() {
  resetRateLimits();
  const auth = await api('POST', '/api/auth/login', null, { email: manifest.accounts.restaurant.email, password: manifest.password });
  const seconds = Math.round((Date.parse(auth.accessTokenExpiresAt) - Date.now()) / 1000);
  if (!auth.refreshToken || !(seconds <= SESSION_MAX_TOKEN_SECONDS)) {
    throw new Error(
      `The session suite needs refresh tokens and access tokens of ${SESSION_MAX_TOKEN_SECONDS} s or less (this stack: ${Number.isFinite(seconds) ? `${seconds} s` : 'unknown'}). ` +
        'Start the backend with `JWT_EXPIRES_IN=60s npm run e2e:env:up` (delivery-plus#244).',
    );
  }
  await api('POST', '/api/auth/logout', null, { refreshToken: auth.refreshToken }).catch(() => undefined);
  console.log(`Session suite: access tokens last ${seconds} s.`);
}

async function login(email) {
  resetRateLimits();
  return (await api('POST', '/api/auth/login', null, { email, password: manifest.password })).accessToken;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/**
 * The verification suite needs the stack to require email verification: a new account must get no
 * tokens. Refuse a stack where it is off rather than pass without testing the code screen.
 */
async function requireEmailVerification() {
  resetRateLimits();
  const probe = await api('POST', '/api/auth/register', null, {
    email: `e2e.verify-probe.${Date.now()}@example.com`,
    password: manifest.password,
    fullName: 'E2E Verify Probe',
    role: 'RESTAURANT_OWNER',
  });
  if (probe?.verificationRequired !== true) {
    if (probe?.refreshToken) await api('POST', '/api/auth/logout', null, { refreshToken: probe.refreshToken }).catch(() => undefined);
    throw new Error(
      'The verification suite needs email verification on. Restart auth-service with `EMAIL_VERIFICATION_REQUIRED=true` ' +
        '(docker compose -p delivery-plus-e2e … up -d --no-deps auth-service; delivery-plus#252).',
    );
  }
  console.log('Verification suite: new accounts wait for their email code.');
}

/** The code the test email sender (EMAIL_PROVIDER=test) kept for `email`; never sent anywhere. */
function readEmailCode(email) {
  const stored = execFileSync('docker', ['exec', container('redis'), 'redis-cli', 'GET', `test:email:${email}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const code = stored ? /\b(\d{6})\b/.exec(JSON.parse(stored).text ?? '')?.[1] : undefined;
  if (!code) throw new Error(`No verification email was sent to ${email}`);
  return code;
}

const state = { orderId: null, awaitingDriver: false };

async function waitForOrderStatus(orderId, token, statuses, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const order = await api('GET', `/api/orders/${orderId}`, token);
    if (statuses.includes(order.status)) return order;
    if (Date.now() > deadline) throw new Error(`Order ${orderId} did not reach ${statuses.join('/')} (last ${order.status})`);
    await sleep(500);
  }
}

const DRIVER_STEPS = ['pickup', 'start', 'complete'];

/** Completes whatever delivery the QA driver is on (fixture only; the driver app covers the UI). */
async function finishCurrentDelivery(driver) {
  const current = await api('GET', '/api/deliveries/me/current', driver);
  const first = current?.nextActions[0];
  if (!first) return false;
  for (const action of DRIVER_STEPS.slice(DRIVER_STEPS.indexOf(first))) {
    await api('POST', `/api/deliveries/${current.id}/${action}`, driver, {});
  }
  return true;
}

/**
 * After the suite: the seed's default state, a free and AVAILABLE QA driver. The customer and driver
 * suites share this E2E stack and rely on it. If a flow left a ready order waiting for a driver, the
 * driver going online picks it up (auto-dispatch sweep), so that delivery is finished too.
 */
async function restoreSeedDriverState() {
  const driver = await login(manifest.accounts.driver.email);
  await finishCurrentDelivery(driver);
  await api('POST', '/api/drivers/me/online', driver, {});
  if (state.awaitingDriver) {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && !(await finishCurrentDelivery(driver))) await sleep(1_000);
    state.awaitingDriver = false;
  }
}

/**
 * Fixture (before and after the suite): the board starts with only the seeded orders. Kitchen orders
 * left CONFIRMED/PREPARING by earlier runs (failed flows here, the customer app's checkout smoke) are
 * cancelled as the owner, so a new order is never pushed below the fold (Maestro web can't scroll
 * react-native-web lists). Seeded orders are never touched.
 */
async function cancelStrayKitchenOrders() {
  const owner = await login(manifest.accounts.restaurant.email);
  const seeded = new Set(Object.values(manifest.orders));
  const { items } = await api('GET', `/api/orders/restaurant/${manifest.restaurants['QA Kitchen']}?limit=100`, owner);
  const stray = items.filter((order) => ['CONFIRMED', 'PREPARING'].includes(order.status) && !seeded.has(order.id));
  for (const order of stray) await api('PATCH', `/api/orders/${order.id}/status`, owner, { status: 'CANCELLED' });
  if (stray.length) console.log(`[fixture] cancelled ${stray.length} leftover kitchen order(s)`);
}

/** seed:e2e's availability: QA Kitchen OPEN, QA Soup sold out, every other item available. */
const SEEDED_SOLD_OUT = new Set(['QA Soup']);

/**
 * Fixture (after the suite): put QA Kitchen and its menu back as the seed left them, so a failed
 * availability flow can't leave the customer and driver suites with a closed restaurant or a
 * sold-out item.
 */
async function restoreSeedAvailability() {
  const owner = await login(manifest.accounts.restaurant.email);
  const kitchen = manifest.restaurants['QA Kitchen'];
  const restaurant = await api('GET', `/api/restaurants/${kitchen}`);
  if (restaurant.status !== 'OPEN') await api('PATCH', `/api/restaurants/${kitchen}/status`, owner, { status: 'OPEN' });
  const menu = await api('GET', `/api/menus/restaurants/${kitchen}/menu`);
  for (const item of menu.items) {
    const available = !SEEDED_SOLD_OUT.has(item.name);
    if (item.available !== available) await api('PATCH', `/api/menus/menu-items/${item.id}/availability`, owner, { available });
  }
}

function container(service) {
  return `${PROJECT}-${service}-1`;
}

/** E2E stack only: clear rate-limit counters so repeated sign-ins across flows don't 429. */
function resetRateLimits() {
  execFileSync(
    'docker',
    ['exec', container('redis'), 'redis-cli', 'EVAL', "for _,k in ipairs(redis.call('KEYS','ratelimit:*')) do redis.call('DEL',k) end return 1", '0'],
    { stdio: 'ignore' },
  );
}

/** The menu editor flow's own names (#148), so it can find what it created and clean up after itself. */
const EDITOR_CATEGORY = 'E2E Desserts';
const EDITOR_ITEM = 'E2E Basbousa';

const actions = {
  // Verification suite (#38): a fresh address for this flow, never used before.
  'verification/new-email': async () => {
    state.newEmail = `e2e.code.${Date.now()}@example.com`;
  },
  // A RESTAURANT_OWNER account for state.newEmail that waits for its code (registered through the API; no tokens).
  'verification/register-unverified': async () => {
    const pending = await api('POST', '/api/auth/register', null, { email: state.newEmail, password: manifest.password, fullName: 'E2E Code', role: 'RESTAURANT_OWNER' });
    if (pending?.verificationRequired !== true) throw new Error(`Registering ${state.newEmail} did not wait for verification`);
  },
  // The latest code emailed to state.newEmail, and a wrong one.
  'verification/read-email-code': async () => {
    state.code = readEmailCode(state.newEmail);
    state.wrongCode = state.code === '000000' ? '111111' : '000000';
  },
  // Fixture (#148): archive what an earlier, interrupted editor run left behind, then drop its category.
  'menu/cleanup': async () => {
    const owner = await login(manifest.accounts.restaurant.email);
    const kitchen = manifest.restaurants['QA Kitchen'];
    const menu = await api('GET', `/api/menus/restaurants/${kitchen}/menu`);
    for (const item of menu.items.filter((i) => i.name === EDITOR_ITEM)) await api('DELETE', `/api/menus/menu-items/${item.id}`, owner);
    for (const category of menu.categories.filter((c) => c.name === EDITOR_CATEGORY)) await api('DELETE', `/api/menus/categories/${category.id}`, owner);
  },
  // Read-only: the ids of what the editor flow created, so the flow can address its rows.
  'menu/find': async () => {
    const menu = await api('GET', `/api/menus/restaurants/${manifest.restaurants['QA Kitchen']}/menu`);
    state.categoryId = menu.categories.find((c) => c.name === EDITOR_CATEGORY)?.id ?? null;
    state.itemId = menu.items.find((i) => i.name === EDITOR_ITEM)?.id ?? state.itemId ?? null;
  },
  // Stand-in for the file picker (#149), which Maestro web can't drive: upload a real 1×1 PNG to the
  // item through the same presign → storage → confirm API the app uses.
  'menu/upload-photo': async () => {
    const owner = await login(manifest.accounts.restaurant.email);
    const presigned = await api('POST', `/api/menus/menu-items/${state.itemId}/image-upload-url`, owner, { contentType: 'image/png' });
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const form = new FormData();
    for (const [key, value] of Object.entries(presigned.fields)) form.append(key, value);
    form.append('file', new Blob([png], { type: 'image/png' }), 'e2e.png');
    const upload = await fetch(presigned.uploadUrl, { method: 'POST', body: form });
    if (!upload.ok) throw new Error(`Storage upload failed: ${upload.status} ${await upload.text()}`);
    const item = await api('POST', `/api/menus/menu-items/${state.itemId}/image-confirm`, owner, { objectKey: presigned.objectKey });
    if (!item.imageUrl || item.images?.length !== 1) throw new Error(`Photo not attached: ${JSON.stringify(item)}`);
  },
  // Verification (as a customer would see it): the archived item is off the public menu, the menu
  // item itself is archived and unavailable, and a cart refuses it.
  'menu/assert-archived': async () => {
    const menu = await api('GET', `/api/menus/restaurants/${manifest.restaurants['QA Kitchen']}/menu`);
    if (menu.items.some((i) => i.id === state.itemId)) throw new Error(`Archived item ${state.itemId} is still on the public menu`);
    const item = await api('GET', `/api/menus/menu-items/${state.itemId}`);
    if (!item.archivedAt || item.available !== false) throw new Error(`Item ${state.itemId} is not archived: ${JSON.stringify(item)}`);
    const customer = await login(manifest.accounts.customer.email);
    const added = await api('POST', '/api/cart/items', customer, { menuItemId: state.itemId, quantity: 1 }).then(() => true, () => false);
    if (added) throw new Error('A customer could add the archived item to their cart');
  },

  // CUSTOMER stand-in (the customer app covers this in its own suite): the QA customer orders and
  // pays, so a fresh CONFIRMED order reaches the restaurant board. Never reuses seeded orders.
  'scenario/order-confirmed': async () => {
    const customer = await login(manifest.accounts.customer.email);
    await api('DELETE', '/api/cart', customer);
    await api('POST', '/api/cart/items', customer, { menuItemId: manifest.menuItems['QA Burger'], quantity: 2 });
    const order = await api('POST', '/api/orders', customer, {});
    const payment = await api('POST', '/api/payments', customer, { orderId: order.id });
    await api('POST', `/api/payments/${payment.id}/process`, customer, { simulateFailure: false });
    await waitForOrderStatus(order.id, customer, ['CONFIRMED']);
    state.orderId = order.id;
  },
  // Verification (as the customer, #154): the kitchen's rejection cancelled the order with the
  // owner's reason, and the customer got an ORDER_CANCELLED notification carrying it.
  'order/assert-rejected': async () => {
    const customer = await login(manifest.accounts.customer.email);
    const order = await waitForOrderStatus(state.orderId, customer, ['CANCELLED']);
    const reason = 'An item is out of stock';
    if (order.cancelledBy !== 'RESTAURANT' || !order.cancellationReason?.includes(reason)) {
      throw new Error(`Order ${state.orderId} was not rejected by the kitchen: ${JSON.stringify({ by: order.cancelledBy, reason: order.cancellationReason })}`);
    }
    const deadline = Date.now() + 20_000;
    for (;;) {
      const notes = await api('GET', '/api/notifications?limit=50', customer);
      const items = notes.items ?? notes;
      if (items.some((note) => note.type === 'ORDER_CANCELLED' && note.message?.includes(reason))) return;
      if (Date.now() > deadline) throw new Error(`The customer was not notified about the rejection of ${state.orderId}`);
      await sleep(1_000);
    }
  },
  // Fixture: no driver free, so a ready order stays READY_FOR_PICKUP (waiting) while the flow checks
  // the board. Restored after the suite by restoreSeedDriverState.
  'driver/offline': async () => {
    const driver = await login(manifest.accounts.driver.email);
    await finishCurrentDelivery(driver);
    await api('POST', '/api/drivers/me/offline', driver, {});
    state.awaitingDriver = true;
  },
  // Verifications (read-only, public reads a customer would see): the owner's changes reached the server.
  'verify/fries-sold-out': async () => {
    const menu = await api('GET', `/api/menus/restaurants/${manifest.restaurants['QA Kitchen']}/menu`);
    const fries = menu.items.find((item) => item.id === manifest.menuItems['QA Fries']);
    if (fries?.available !== false) throw new Error(`QA Fries is ${fries?.available ? 'available' : 'missing'} on the public menu, expected sold out`);
  },
  'verify/kitchen-busy': async () => {
    const restaurant = await api('GET', `/api/restaurants/${manifest.restaurants['QA Kitchen']}`);
    if (restaurant.status !== 'BUSY') throw new Error(`QA Kitchen is ${restaurant.status}, expected BUSY`);
  },
  // Verification (as the customer): the order the kitchen marked ready is READY_FOR_PICKUP and
  // automatic dispatch created its delivery. Nothing here creates or assigns a delivery.
  'order/assert-dispatched': async () => {
    const customer = await login(manifest.accounts.customer.email);
    await waitForOrderStatus(state.orderId, customer, ['READY_FOR_PICKUP', 'DRIVER_ASSIGNED']);
    const deadline = Date.now() + 20_000;
    for (;;) {
      const delivery = await api('GET', `/api/deliveries/by-order/${state.orderId}`, customer).catch(() => null);
      if (delivery?.id) return;
      if (Date.now() > deadline) throw new Error(`No delivery was dispatched for order ${state.orderId}`);
      await sleep(1_000);
    }
  },
};

const control = createServer(async (req, res) => {
  const action = (req.url ?? '').replace(/^\//, '');
  try {
    if (req.method !== 'POST' || !actions[action]) throw Object.assign(new Error(`Unknown action ${action}`), { code: 404 });
    await actions[action]();
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ action, ...state }));
  } catch (error) {
    console.error(`[control] ${action} failed:`, error.message);
    res.writeHead(error.code ?? 500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.message }));
  }
});

// ---------------------------------------------------------------------------------------------

function buildWeb() {
  console.log(`Building web app against ${API_URL} ...`);
  rmSync(WEB_BUILD, { recursive: true, force: true });
  // --clear matters: a warm Metro cache can keep a previously inlined EXPO_PUBLIC_API_BASE_URL.
  const result = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', WEB_BUILD, '--clear'], {
    cwd: APP_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, CI: '1', EXPO_PUBLIC_API_BASE_URL: API_URL, EXPO_PUBLIC_DEFAULT_LOCALE: process.env.E2E_LOCALE ?? 'en' },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

/** Asynchronous: flows call back into this process's control server (spawnSync would deadlock). */
function runFlow(flow) {
  const name = flow.replace(/[\\/]/g, '__').replace(/\.yaml$/, '');
  const outDir = join(ARTIFACTS, name);
  mkdirSync(outDir, { recursive: true });
  const env = {
    APP_URL,
    CONTROL_URL,
    EMAIL: manifest.accounts.restaurant.email,
    PASSWORD: manifest.password,
    RESTAURANT_ID: manifest.restaurants['QA Kitchen'],
    FRIES_ID: manifest.menuItems['QA Fries'],
  };
  const maestroArgs = [
    'test',
    join(E2E_DIR, 'flows', flow),
    '--format',
    'JUNIT',
    '--output',
    join(ARTIFACTS, `${name}.junit.xml`),
    '--test-output-dir',
    outDir,
    '--debug-output',
    outDir,
    '--flatten-debug-output',
    ...(flag('headless') ? ['--headless', '--screen-size', SCREEN_SIZE] : []),
    ...Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`]),
  ];
  resetRateLimits();
  const started = Date.now();
  return new Promise((resolveFlow) => {
    const child = spawn(MAESTRO, maestroArgs, { stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('exit', (code) => resolveFlow({ flow, ok: code === 0, seconds: Math.round((Date.now() - started) / 1000) }));
  });
}

async function main() {
  if (flag('build') || !existsSync(join(WEB_BUILD, 'index.html'))) buildWeb();
  mkdirSync(ARTIFACTS, { recursive: true });

  await fetch(`${API_URL}/health`).then(
    (r) => {
      if (!r.ok) throw new Error();
    },
    () => {
      throw new Error(`E2E gateway not reachable at ${API_URL}. Start it with \`npm run e2e:env:up\` in delivery-plus.`);
    },
  );

  if (suite === 'session') await requireShortAccessTokens();
  if (suite === 'verification') await requireEmailVerification();

  const web = spawn(process.execPath, [join(E2E_DIR, 'scripts', 'serve-web.mjs'), WEB_BUILD, String(WEB_PORT)], { stdio: 'inherit' });
  await new Promise((r) => control.listen(CONTROL_PORT, '127.0.0.1', r));
  await sleep(500);
  // The kitchen fixtures sign in as the seeded owner, created while email verification was off; the
  // verification suite (#38) runs with it on and never touches the kitchen, so it skips them.
  const kitchenFixtures = suite !== 'verification';
  if (kitchenFixtures) await cancelStrayKitchenOrders();

  const results = [];
  try {
    for (const flow of SUITES[suite]) {
      console.log(`\n=== ${flow}`);
      results.push(await runFlow(flow));
    }
  } finally {
    if (kitchenFixtures) await restoreSeedDriverState().catch((error) => console.error('[cleanup] restoring the QA driver failed:', error.message));
    if (kitchenFixtures) await cancelStrayKitchenOrders().catch((error) => console.error('[cleanup] cancelling leftover orders failed:', error.message));
    if (kitchenFixtures) await restoreSeedAvailability().catch((error) => console.error('[cleanup] restoring menu/restaurant availability failed:', error.message));
    web.kill();
    control.close();
  }

  console.log(`\nSuite "${suite}" results (artifacts: ${ARTIFACTS})`);
  for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.flow}  (${r.seconds}s)`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`${results.length - failed}/${results.length} flows passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
