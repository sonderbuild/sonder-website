/** Local-only, allowlisted source copy. Never copies .env, .vercel or credentials. */
import { cp, mkdtemp, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
if (process.argv.slice(2).some(arg => arg !== '--marketing-only')) throw new Error('Unknown build qualification option');
const marketingOnly = process.argv.includes('--marketing-only');
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const destination = await mkdtemp(join(tmpdir(), 'sonder-website-worker-'));
const inputs = ['src', 'public', 'cloudflare', 'scripts/cloudflare', 'sanity/schemaTypes', 'next.config.ts', 'open-next.config.ts', 'tsconfig.json', 'postcss.config.mjs', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'];
for (const name of inputs) await cp(join(root, name), join(destination, name), { recursive: true, dereference: false });
// OpenNext explicitly does not support Node proxy. Next16 still supports Edge
// middleware. The AuthKit function and exact matcher stay byte-identical.
await rename(join(destination, 'src/proxy.ts'), join(destination, 'src/middleware.ts'));
const quote = value => "'" + value.replaceAll("'", "'\"'\"'") + "'";
const buildCommand = [process.execPath, join(destination, 'node_modules/next/dist/bin/next')].map(quote).join(' ') + ' build --webpack';
const config = await readFile(join(destination, 'open-next.config.ts'), 'utf8');
await writeFile(join(destination, 'open-next.config.ts'), config + `\nconfig.buildCommand = ${JSON.stringify(buildCommand)};\n`);
await writeFile(join(destination, 'wrangler.jsonc'), JSON.stringify({
  name: 'sonder-website-local-qualification', main: 'cloudflare/worker.mjs',
  compatibility_date: '2026-10-26', compatibility_flags: ['nodejs_compat'],
  workers_dev: false, preview_urls: false, vars: { SONDER_WEBSITE_ORIGIN: 'https://website.example.invalid', ...(marketingOnly ? { SONDER_SITE_MODE: 'marketing-only' } : {}) }, assets: { directory: '.open-next/assets', binding: 'ASSETS' },
}, null, 2));
const hashes = {};
async function inventory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Source symlinks are not qualification inputs');
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await inventory(path);
    else hashes[relative(destination, path)] = createHash('sha256').update(await readFile(path)).digest('hex');
  }
}
for (const name of ['src', 'public', 'cloudflare', 'scripts/cloudflare', 'sanity/schemaTypes']) await inventory(join(destination, name));
for (const name of inputs.filter(x => !['src', 'public', 'cloudflare', 'scripts/cloudflare', 'sanity/schemaTypes'].includes(x)).concat(['open-next.config.ts', 'wrangler.jsonc']))
  hashes[name] = createHash('sha256').update(await readFile(join(destination, name))).digest('hex');
await writeFile(join(destination, 'qualification-inputs.json'), JSON.stringify({
  purpose: 'local-synthetic-only', sourceRoot: root, siteMode: marketingOnly ? 'marketing-only' : 'customer-platform',
  transformation: 'src/proxy.ts -> src/middleware.ts, unchanged AuthKit function/matcher', hashes,
}, null, 2));
console.log(`QUALIFICATION_DIRECTORY=${destination}`);
const env = {
  PATH: process.env.PATH, CI: '1', NEXT_TELEMETRY_DISABLED: '1', WRANGLER_SEND_METRICS: 'false',
  WORKOS_API_KEY: 'sk_test_synthetic_worker_only', WORKOS_CLIENT_ID: 'client_synthetic_worker_only',
  WORKOS_COOKIE_PASSWORD: 'synthetic-worker-cookie-password-not-for-runtime',
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'https://website.example.invalid/login',
  SONDER_API_ORIGIN: 'https://customer-api.example.invalid', SONDER_WEBSITE_ORIGIN: 'https://website.example.invalid',
  ...(marketingOnly ? { SONDER_SITE_MODE: 'marketing-only' } : {}),
  SANITY_PROJECT_ID: '', SANITY_DATASET: '', SONDER_SOCIAL_PROVIDERS: '',
};
// Clone the installed, lockfile-pinned dependency tree locally; no package scripts
// or network install occurs during qualification. Relative pnpm links stay local.
await cp(join(root, 'node_modules'), join(destination, 'node_modules'), { recursive: true, dereference: false, verbatimSymlinks: true, mode: constants.COPYFILE_FICLONE });
const result = spawnSync(join(root, 'node_modules/.bin/opennextjs-cloudflare'), ['build'], {
  cwd: destination, env, stdio: 'inherit', timeout: 240000,
});
if (result.error) throw result.error;
if (result.status === 0) {
  // Native supported read-only cache population: copies build output into assets,
  // with this exact static-assets override; no R2/KV/D1 or remote target.
  const cache = spawnSync(join(root, 'node_modules/.bin/opennextjs-cloudflare'), ['populateCache', 'local'], { cwd: destination, env, stdio: 'inherit', timeout: 60000 });
  if (cache.error) throw cache.error;
  if (cache.status !== 0) throw new Error('Local static assets cache population failed');
  await cp(join(destination, 'cloudflare/_headers'), join(destination, '.open-next/assets/_headers'));
}
process.exitCode = result.status ?? 1;
