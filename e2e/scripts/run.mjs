#!/usr/bin/env node
// Runs the Maestro UI suites against the isolated E2E backend (delivery-plus: `npm run e2e:env:up`
// + `npm run seed:e2e`). See e2e/README.md.
//
//   node e2e/scripts/run.mjs --suite smoke|regression|business|all [--build] [--headless]
//
// Env: E2E_API_URL (http://localhost:3100), E2E_WEB_PORT (8083), E2E_CONTROL_PORT (8090),
//      E2E_MANIFEST (../delivery-plus/e2e-seed-manifest.json), MAESTRO_BIN (maestro),
//      E2E_COMPOSE_PROJECT (delivery-plus-e2e),
//      DRIVER_APP_DIR (../delivery-plus-driver-app; the driver app for the cross-app flows),
//      E2E_DRIVER_WEB_PORT (8084), E2E_SKIP_CROSS_APP (1 = skip cross-app flows, e.g. CI without
//      access to the driver repo)
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
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 8083);
const CONTROL_PORT = Number(process.env.E2E_CONTROL_PORT ?? 8090);
const APP_URL = `http://localhost:${WEB_PORT}`;
const CONTROL_URL = `http://localhost:${CONTROL_PORT}`;
const MANIFEST = resolve(process.env.E2E_MANIFEST ?? join(APP_DIR, '..', 'delivery-plus', 'e2e-seed-manifest.json'));
const MAESTRO = process.env.MAESTRO_BIN ?? 'maestro';
const PROJECT = process.env.E2E_COMPOSE_PROJECT ?? 'delivery-plus-e2e';
const WEB_BUILD = join(E2E_DIR, '.web-build');
const SCREEN_SIZE = process.env.E2E_SCREEN_SIZE ?? '430x1600';
const ARTIFACTS = join(E2E_DIR, '.artifacts', suite);

// The real driver app (separate repo) takes part in the cross-app flows: its web build is served on
// :8084 (allowed by the gateway's development CORS) and reports a fixed position, because Maestro's
// web driver can't grant or fake geolocation.
const DRIVER_APP_DIR = resolve(process.env.DRIVER_APP_DIR ?? join(APP_DIR, '..', 'delivery-plus-driver-app'));
const DRIVER_WEB_PORT = Number(process.env.E2E_DRIVER_WEB_PORT ?? 8084);
const DRIVER_APP_URL = `http://localhost:${DRIVER_WEB_PORT}`;
const DRIVER_WEB_BUILD = join(E2E_DIR, '.driver-web-build');
const DRIVER_FIXED_LOCATION = { latitude: 30.0444, longitude: 31.2357 };
const CROSS_APP_FLOWS = new Set(['regression/order-awaiting-driver.yaml', 'business/customer-order-lifecycle.yaml']);
const SKIP_CROSS_APP = process.env.E2E_SKIP_CROSS_APP === '1';

const SUITES = {
  smoke: ['smoke/01-login.yaml', 'smoke/02-browse.yaml', 'smoke/03-cart.yaml', 'smoke/04-checkout.yaml'],
  regression: [
    'regression/order-awaiting-driver.yaml',
    'regression/order-payment-failed.yaml',
    'regression/unauthorized-order.yaml',
    'regression/offline-recovery.yaml',
  ],
  business: ['business/customer-order-lifecycle.yaml'],
};
SUITES.all = [...SUITES.smoke, ...SUITES.regression, ...SUITES.business];

if (!SUITES[suite]) {
  console.error(`Unknown suite "${suite}". Use one of: ${Object.keys(SUITES).join(', ')}`);
  process.exit(2);
}
if (!existsSync(MANIFEST)) {
  console.error(`No seed manifest at ${MANIFEST}. Run \`npm run seed:e2e\` in delivery-plus first.`);
  process.exit(2);
}
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

// ---------------------------------------------------------------------------------------------
// Gateway client used by the control server (restaurant stand-in, fixtures, verifications).
// ---------------------------------------------------------------------------------------------

async function api(method, path, token, body) {
  const res = await fetch(API_URL + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return data;
}

async function login(email) {
  resetRateLimits();
  return (await api('POST', '/api/auth/login', null, { email, password: manifest.password })).accessToken;
}

// The order the current flow is about (set by the restaurant stand-in / scenario).
const state = { orderId: null };

async function latestKitchenOrder(owner, status) {
  const restaurantId = manifest.restaurants['QA Kitchen'];
  const { items } = await api('GET', `/api/orders/restaurant/${restaurantId}?limit=50`, owner);
  const matching = items.filter((order) => order.status === status);
  matching.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  if (!matching[0]) throw new Error(`No ${status} order at QA Kitchen`);
  return matching[0];
}

async function waitForOrderStatus(orderId, token, status, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const order = await api('GET', `/api/orders/${orderId}`, token);
    if (order.status === status) return order;
    if (Date.now() > deadline) throw new Error(`Order ${orderId} did not reach ${status} (last ${order.status})`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

function container(service) {
  return `${PROJECT}-${service}-1`;
}

function docker(...cmd) {
  return execFileSync('docker', cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** E2E stack only: clear per-IP/per-user rate-limit counters so repeated sign-ins across flows don't 429. */
function resetRateLimits() {
  docker(
    'exec',
    container('redis'),
    'redis-cli',
    'EVAL',
    "for _,k in ipairs(redis.call('KEYS','ratelimit:*')) do redis.call('DEL',k) end return 1",
    '0',
  );
}

/** Messages ever written to each dead-letter topic (end offsets summed over partitions; 0 if absent). */
function deadLetterCounts() {
  const counts = {};
  for (const topic of ['order.events.dlq', 'payment.events.dlq', 'delivery.events.dlq']) {
    let out = '';
    try {
      out = docker('exec', container('kafka'), 'kafka-run-class', 'kafka.tools.GetOffsetShell', '--broker-list', 'localhost:9092', '--topic', topic, '--time', '-1');
    } catch {
      out = ''; // topic not created yet → nothing dead-lettered
    }
    counts[topic] = out
      .split('\n')
      .map((line) => Number(line.trim().split(':')[2]))
      .filter(Number.isFinite)
      .reduce((sum, n) => sum + n, 0);
  }
  return counts;
}

/** Rows in delivery-service's own table for one order (proves there is no duplicate delivery). */
function deliveryRowsForOrder(orderId) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error(`Not an order id: ${orderId}`);
  const out = docker('exec', container('postgres'), 'psql', '-U', 'postgres', '-d', 'delivery_service', '-Atc', `select count(*) from deliveries where "orderId" = '${orderId}'`);
  return Number(out.trim());
}

/**
 * Suite fixture, not a flow step: the seed's driver state (QA driver free and AVAILABLE). A flow that
 * failed half-way can leave the QA driver on a delivery; this finishes it through the API so the next
 * run starts clean. The flows themselves drive the driver only through the driver app.
 */
async function restoreSeedDriverState() {
  const driver = await login(manifest.accounts.driver.email);
  const current = await api('GET', '/api/deliveries/me/current', driver);
  const steps = ['pickup', 'start', 'complete'];
  const first = current?.nextActions?.[0];
  if (first) {
    for (const action of steps.slice(steps.indexOf(first))) await api('POST', `/api/deliveries/${current.id}/${action}`, driver, {});
  }
  await api('POST', '/api/drivers/me/online', driver, {});
}

let deadLettersAtStart = null;

async function waitForGateway(up, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await fetch(`${API_URL}/health`).then((r) => r.ok, () => false);
    if (ok === up) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Gateway did not become ${up ? 'healthy' : 'unreachable'} in time`);
}

const actions = {
  // RESTAURANT stand-in (qa.restaurant): accept/prepare the newest confirmed order, then mark it ready.
  'restaurant/prepare': async () => {
    const owner = await login(manifest.accounts.restaurant.email);
    const order = await latestKitchenOrder(owner, 'CONFIRMED');
    state.orderId = order.id;
    await api('PATCH', `/api/orders/${order.id}/status`, owner, { status: 'PREPARING' });
  },
  'restaurant/ready': async () => {
    const owner = await login(manifest.accounts.restaurant.email);
    await api('PATCH', `/api/orders/${state.orderId}/status`, owner, { status: 'READY_FOR_PICKUP' });
  },
  // There is no dispatch stand-in: delivery-service dispatches on order.ready_for_pickup by itself.
  // There is no driver stand-in either: flows drive the QA driver through the real driver app.

  // A ready order with no driver free: the QA driver must be offline first (in the driver app).
  // Placed through the API as the QA customer, then prepared and marked ready by the restaurant.
  'scenario/order-ready': async () => {
    const customer = await login(manifest.accounts.customer.email);
    const owner = await login(manifest.accounts.restaurant.email);
    await api('DELETE', '/api/cart', customer);
    await api('POST', '/api/cart/items', customer, { menuItemId: manifest.menuItems['QA Pasta'], quantity: 1 });
    const order = await api('POST', '/api/orders', customer, {});
    const payment = await api('POST', '/api/payments', customer, { orderId: order.id });
    await api('POST', `/api/payments/${payment.id}/process`, customer, { simulateFailure: false });
    await waitForOrderStatus(order.id, customer, 'CONFIRMED');
    await api('PATCH', `/api/orders/${order.id}/status`, owner, { status: 'PREPARING' });
    await api('PATCH', `/api/orders/${order.id}/status`, owner, { status: 'READY_FOR_PICKUP' });
    state.orderId = order.id;
  },
  // VERIFICATIONS (read-only, as the customer or from the stack's own stores).
  // The customer's tracking view returns the position the driver app sent (fixed in its E2E build).
  'tracking/assert-location': async () => {
    const customer = await login(manifest.accounts.customer.email);
    const delivery = await api('GET', `/api/deliveries/by-order/${state.orderId}`, customer);
    const deadline = Date.now() + 20_000;
    for (;;) {
      const tracking = await api('GET', `/api/tracking/delivery/${delivery.id}`, customer);
      const { latitude, longitude } = tracking.location ?? {};
      if (latitude === DRIVER_FIXED_LOCATION.latitude && longitude === DRIVER_FIXED_LOCATION.longitude) return;
      if (Date.now() > deadline) throw new Error(`No driver location for delivery ${delivery.id} (got ${JSON.stringify(tracking.location)})`);
      await new Promise((r) => setTimeout(r, 1_000));
    }
  },
  // After the cycle: order and delivery DELIVERED, exactly one delivery for the order (automatic
  // dispatch, no duplicate), and nothing new in any dead-letter topic since the suite started.
  'verify/order-integrity': async () => {
    const customer = await login(manifest.accounts.customer.email);
    await waitForOrderStatus(state.orderId, customer, 'DELIVERED');
    const delivery = await api('GET', `/api/deliveries/by-order/${state.orderId}`, customer);
    if (delivery.status !== 'DELIVERED') throw new Error(`Delivery ${delivery.id} is ${delivery.status}, expected DELIVERED`);
    const rows = deliveryRowsForOrder(state.orderId);
    if (rows !== 1) throw new Error(`Order ${state.orderId} has ${rows} deliveries, expected exactly 1`);
    const now = deadLetterCounts();
    const grown = Object.keys(now).filter((topic) => now[topic] !== deadLettersAtStart[topic]);
    if (grown.length) throw new Error(`New dead letters: ${grown.map((t) => `${t} ${deadLettersAtStart[t]} → ${now[t]}`).join(', ')}`);
  },
  // Fault injection for the offline-recovery flow.
  'gateway/stop': async () => {
    docker('stop', container('api-gateway'));
    await waitForGateway(false);
  },
  'gateway/start': async () => {
    docker('start', container('api-gateway'));
    await waitForGateway(true);
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

function buildWeb(appDir = APP_DIR, outDir = WEB_BUILD, extraEnv = {}) {
  console.log(`Building ${appDir} for web against ${API_URL} ...`);
  rmSync(outDir, { recursive: true, force: true });
  // --clear matters: a warm Metro cache can keep a previously inlined EXPO_PUBLIC_API_BASE_URL.
  const result = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', outDir, '--clear'], {
    cwd: appDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, CI: '1', EXPO_PUBLIC_API_BASE_URL: API_URL, ...extraEnv },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function buildDriverWeb() {
  if (!existsSync(join(DRIVER_APP_DIR, 'package.json'))) {
    console.error(`Driver app not found at ${DRIVER_APP_DIR}. Clone delivery-plus-driver-app next to this repo (npm ci), set DRIVER_APP_DIR, or set E2E_SKIP_CROSS_APP=1.`);
    process.exit(2);
  }
  buildWeb(DRIVER_APP_DIR, DRIVER_WEB_BUILD, {
    EXPO_PUBLIC_FIXED_LOCATION: `${DRIVER_FIXED_LOCATION.latitude},${DRIVER_FIXED_LOCATION.longitude}`,
  });
}

/**
 * Maestro must run asynchronously: flows call back into this process's control server, so a
 * spawnSync here would block the event loop and deadlock the first runScript step.
 */
function runFlow(flow) {
  const name = flow.replace(/[\\/]/g, '__').replace(/\.yaml$/, '');
  const outDir = join(ARTIFACTS, name);
  mkdirSync(outDir, { recursive: true });
  const env = {
    APP_URL,
    CONTROL_URL,
    DRIVER_APP_URL,
    DRIVER_EMAIL: manifest.accounts.driver.email,
    EMAIL: manifest.accounts.customer.email,
    PASSWORD: manifest.password,
    FAILED_ORDER_ID: manifest.orders.failed,
    OTHER_ORDER_ID: manifest.orders.otherCustomer,
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
    // Headless Chromium with a phone-width, tall viewport. Maestro's web driver cannot scroll
    // react-native-web ScrollViews (it scrolls the window; RN-Web keeps body overflow hidden), so the
    // viewport must fit each screen; scrollUntilVisible steps stay for Android/iOS runs.
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
  const flows = SUITES[suite].filter((flow) => !(SKIP_CROSS_APP && CROSS_APP_FLOWS.has(flow)));
  const skipped = SUITES[suite].filter((flow) => !flows.includes(flow));
  const crossApp = flows.some((flow) => CROSS_APP_FLOWS.has(flow));

  if (flag('build') || !existsSync(join(WEB_BUILD, 'index.html'))) buildWeb();
  if (crossApp && (flag('build') || !existsSync(join(DRIVER_WEB_BUILD, 'index.html')))) buildDriverWeb();
  mkdirSync(ARTIFACTS, { recursive: true });

  await fetch(`${API_URL}/health`).then(
    (r) => { if (!r.ok) throw new Error(); },
    () => { throw new Error(`E2E gateway not reachable at ${API_URL}. Start it with \`npm run e2e:env:up\` in delivery-plus.`); },
  );

  const serve = (dir, port) => spawn(process.execPath, [join(E2E_DIR, 'scripts', 'serve-web.mjs'), dir, String(port)], { stdio: 'inherit' });
  const web = serve(WEB_BUILD, WEB_PORT);
  const driverWeb = crossApp ? serve(DRIVER_WEB_BUILD, DRIVER_WEB_PORT) : null;
  await new Promise((r) => control.listen(CONTROL_PORT, '127.0.0.1', r));
  await new Promise((r) => setTimeout(r, 500));

  // Fixture: start from the seed's driver state, and remember the dead-letter counts to compare.
  if (crossApp) await restoreSeedDriverState();
  deadLettersAtStart = deadLetterCounts();

  const results = [];
  try {
    for (const flow of flows) {
      console.log(`\n=== ${flow}`);
      results.push(await runFlow(flow));
    }
  } finally {
    // Never leave the gateway stopped if a fault-injection flow failed half-way.
    if (!(await fetch(`${API_URL}/health`).then((r) => r.ok, () => false))) await actions['gateway/start']();
    // Leave the QA driver as the seed did (free, AVAILABLE) for the next run or the driver suite.
    if (crossApp) await restoreSeedDriverState().catch((error) => console.error('[cleanup] restoring the QA driver failed:', error.message));
    web.kill();
    driverWeb?.kill();
    control.close();
  }

  console.log(`\nSuite "${suite}" results (artifacts: ${ARTIFACTS})`);
  for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.flow}  (${r.seconds}s)`);
  for (const flow of skipped) console.log(`  SKIP  ${flow}  (cross-app; E2E_SKIP_CROSS_APP=1)`);
  if (skipped.length && process.env.GITHUB_ACTIONS) {
    console.log(`::warning::${skipped.length} cross-app flow(s) skipped: the driver app was not available to this run.`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`${results.length - failed}/${results.length} flows passed${skipped.length ? `, ${skipped.length} skipped` : ''}`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
