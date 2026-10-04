#!/usr/bin/env node
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const E2E_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIR = resolve(E2E_DIR, '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const hasFlag = (name) => args.includes(`--${name}`);
const suite = option('suite', 'smoke');
const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:3100';
const webPort = Number(process.env.E2E_WEB_PORT ?? 8083);
const appUrl = `http://localhost:${webPort}`;
const manifestPath = resolve(process.env.E2E_MANIFEST ?? join(APP_DIR, '..', 'delivery-plus', 'e2e-seed-manifest.json'));
const buildDir = join(E2E_DIR, '.web-build');
const artifactsDir = join(E2E_DIR, '.artifacts', suite);
const maestro = process.env.MAESTRO_BIN ?? 'maestro';
const screenSize = process.env.E2E_SCREEN_SIZE ?? '1440x1100';
const suites = {
  smoke: ['smoke/01-restaurant-orders.yaml'],
  business: ['business/01-kitchen-lifecycle.yaml'],
};
suites.all = [...suites.smoke, ...suites.business];

if (!suites[suite]) {
  console.error(`Unknown suite "${suite}". Use one of: ${Object.keys(suites).join(', ')}`);
  process.exit(2);
}
if (!existsSync(manifestPath)) {
  console.error(`No seed manifest at ${manifestPath}. Run npm run seed:e2e in delivery-plus first.`);
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function resetRateLimits() {
  execFileSync('docker', [
    'exec', 'delivery-plus-e2e-redis-1', 'redis-cli', 'EVAL',
    "for _,k in ipairs(redis.call('KEYS','ratelimit:*')) do redis.call('DEL',k) end return 1", '0',
  ], { stdio: 'ignore' });
}

async function gatewayRequest(method, path, token, body) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} returned ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function verifyFixture() {
  resetRateLimits();
  const auth = await gatewayRequest('POST', '/api/auth/login', null, {
    email: manifest.accounts.restaurant.email,
    password: manifest.password,
  });
  const order = await gatewayRequest('GET', `/api/orders/${manifest.orders.otherCustomer}`, auth.accessToken);
  if (order.status !== 'CONFIRMED') {
    throw new Error(`The seeded restaurant order is ${order.status}, expected CONFIRMED. Reset the E2E stack and seed it again.`);
  }
}

function buildWeb() {
  console.log(`Building restaurant dashboard for web against ${apiUrl} ...`);
  rmSync(buildDir, { recursive: true, force: true });
  const result = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', buildDir, '--clear'], {
    cwd: APP_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, CI: '1', EXPO_PUBLIC_API_BASE_URL: apiUrl },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function waitFor(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fetch(url).then((response) => response.ok, () => false)) return;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function runFlow(flow) {
  const name = flow.replace(/[\\/]/g, '__').replace(/\.yaml$/, '');
  const outputDir = join(artifactsDir, name);
  mkdirSync(outputDir, { recursive: true });
  resetRateLimits();
  const flowEnv = {
    APP_URL: appUrl,
    EMAIL: manifest.accounts.restaurant.email,
    PASSWORD: manifest.password,
    ORDER_ID: manifest.orders.otherCustomer,
  };
  const result = spawnSync(maestro, [
    'test',
    join(E2E_DIR, 'flows', flow),
    '--format', 'JUNIT',
    '--output', join(artifactsDir, `${name}.junit.xml`),
    '--test-output-dir', outputDir,
    '--debug-output', outputDir,
    '--flatten-debug-output',
    ...(hasFlag('headless') ? ['--headless', '--screen-size', screenSize] : []),
    ...Object.entries(flowEnv).flatMap(([key, value]) => ['-e', `${key}=${value}`]),
  ], { cwd: APP_DIR, stdio: 'inherit', shell: process.platform === 'win32' });
  return { flow, ok: result.status === 0 };
}

async function main() {
  const gatewayHealth = await fetch(`${apiUrl}/health`).then((response) => response.ok, () => false);
  if (!gatewayHealth) throw new Error(`E2E gateway is unavailable at ${apiUrl}. Start the isolated backend stack first.`);
  await verifyFixture();
  if (hasFlag('build') || !existsSync(join(buildDir, 'index.html'))) buildWeb();

  mkdirSync(artifactsDir, { recursive: true });
  const webServer = spawn(process.execPath, [join(E2E_DIR, 'scripts', 'serve-web.mjs'), buildDir, String(webPort)], { stdio: 'inherit' });
  try {
    await waitFor(appUrl);
    const results = suites[suite].map(runFlow);
    for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.flow}`);
    process.exitCode = results.every((result) => result.ok) ? 0 : 1;
  } finally {
    webServer.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});