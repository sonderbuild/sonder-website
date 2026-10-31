/** Executes the compiled application in workerd; all outbound requests are mocked. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, stat, readdir, realpath } from 'node:fs/promises';
import { join, resolve, basename, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { summarizeProfile } from './profile-summary.mjs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
// Native workerd diagnostics can bypass Miniflare's JS Log callbacks. Capture
// the whole child transcript so an unhandled native error cannot produce PASS.
if (!process.argv.includes('--runtime-child')) {
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2), '--runtime-child'], { encoding: 'utf8', timeout: 180000, maxBuffer: 4194304 });
  const diagnostic = /uncaught exception|Uncaught \(async\)|UnhandledPromiseRejection/.test(child.stdout + child.stderr);
  process.stdout.write(child.stdout ?? ''); process.stderr.write(child.stderr ?? '');
  if (child.error) throw child.error;
  if (diagnostic) {
    const report = resolve(process.argv[2], process.argv.includes('--profile') ? 'qualification-profile-results.json' : 'qualification-results.json');
    const result = JSON.parse(await readFile(report)); result.runtimeDisposition = 'BLOCKED: native unhandled diagnostic; functional assertions do not qualify runtime';
    await writeFile(report, JSON.stringify(result, null, 2));
    console.error(result.runtimeDisposition);
  }
  process.exit(diagnostic ? 1 : child.status ?? 1);
}
const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve('wrangler'));
const { Miniflare, convertV4MiniflareOptions, Log, LogLevel } = wranglerRequire('miniflare');
const sdkRequire = createRequire(import.meta.resolve('@workos-inc/authkit-nextjs'));
const { sealData } = sdkRequire('iron-session');
const { generateKeyPair, exportJWK, SignJWT } = sdkRequire('jose');
const directory = await realpath(resolve(process.argv[2] ?? 'MISSING_QUALIFICATION_DIRECTORY'));
assert.ok(directory.startsWith((await realpath(tmpdir()))+sep) && basename(directory).startsWith('sonder-website-worker-'), 'Owned temporary qualification directory required');
assert.ok(!(await readdir(directory)).some(name=>name.startsWith('.env') || name.startsWith('.dev.vars') || name==='.vercel'), 'Environment/credential files are forbidden');
const metadata=await readFile(join(directory, 'qualification-inputs.json')); assert.ok(metadata.length<=1048576);
const input = JSON.parse(metadata.toString());
assert.equal(input.purpose, 'local-synthetic-only');
assert.notEqual(input.diagnosticOnly,true,'Diagnostic builds cannot qualify');
for (const [name, digest] of Object.entries(input.hashes)) {
  assert.equal(createHash('sha256').update(await readFile(join(directory, name))).digest('hex'), digest, `Changed input: ${name}`);
}
const output = join(directory, '.open-next');
const config = JSON.parse(await readFile(join(directory, 'wrangler.jsonc'), 'utf8'));
assert.equal(config.name,'sonder-website-local-qualification'); assert.equal(config.main,'cloudflare/worker.mjs');
assert.equal(config.workers_dev,false); assert.equal(config.preview_urls,false);
assert.deepEqual(Object.keys(config).sort(),['name','main','compatibility_date','compatibility_flags','workers_dev','preview_urls','vars','assets'].sort());
const marketingOnly = input.siteMode === 'marketing-only';
assert.deepEqual(config.vars,{SONDER_WEBSITE_ORIGIN:'https://website.example.invalid', ...(marketingOnly ? {SONDER_SITE_MODE:'marketing-only'} : {})});
assert.deepEqual(config.assets,{directory:'.open-next/assets',binding:'ASSETS'});
const prerenderManifest=JSON.parse(await readFile(join(directory,'.next/prerender-manifest.json')));
for(const route of ['/','/apps/mactric']) assert.equal(prerenderManifest.routes[route]?.initialRevalidateSeconds,false,'Static non-ISR route required');
assert.ok(!Object.keys(prerenderManifest.routes).some(route=>/^\/(account|login|api)(\/|$)/.test(route)),'Private routes must never enter public prerender inventory');
const publicCacheDirectory=join(output,'assets/cdn-cgi/_next_cache');
const cachedFiles=await readdir(publicCacheDirectory,{recursive:true});
assert.ok(cachedFiles.some(f=>f.endsWith('/index.cache'))&&cachedFiles.some(f=>f.endsWith('/apps/mactric.cache')),'Populated native static cache entries required before qualification');
for(const file of cachedFiles.filter(f=>f.endsWith('.cache'))){
 const entry=JSON.parse(await readFile(join(publicCacheDirectory,file)));
 assert.ok(!Object.keys(entry.meta?.headers??{}).some(k=>k.toLowerCase()==='set-cookie'),'No session cookies in static cache');
 assert.ok(!JSON.stringify(entry).includes('synthetic-worker-cookie-password-not-for-runtime'),'No secret in public cache');
}
const bundleDirectory = join(directory, 'qualification-bundle');
const bundled = join(bundleDirectory, basename(config.main).replace(/\.mjs$/, '.js'));
const dryRun = spawnSync(process.execPath, [new URL('../../node_modules/wrangler/bin/wrangler.js', import.meta.url).pathname, 'deploy', '--dry-run', '--no-autoconfig', '--outdir', bundleDirectory, '--metafile', join(directory, 'qualification-metafile.json')], {
  cwd: directory, env: { PATH: process.env.PATH, CI: '1', WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG_PATH: join(directory, 'qualification-wrangler.log') }, stdio: 'inherit', timeout: 60000,
});
if (dryRun.error) throw dryRun.error;
assert.equal(dryRun.status, 0, 'Local Wrangler dry-run bundle');
const bundle = await readFile(bundled);
assert.ok(!bundle.subarray(0,64).toString().includes('formdata'), 'Expected raw JS, not a multipart upload artifact');
const password = 'synthetic-worker-cookie-password-not-for-runtime';
const client = 'client_synthetic_worker_only';
const base = 'https://website.example.invalid';
const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = { ...await exportJWK(publicKey), kid: 'synthetic-jwk', alg: 'RS256', use: 'sig' };
const user = { object: 'user', id: 'user_synthetic_a', email: 'qa-a@example.invalid', email_verified: true, first_name: null, last_name: null, profile_picture_url: null, created_at: '2026-10-26T00:00:00Z', updated_at: '2026-10-26T00:00:00Z', metadata: {} };
async function token(subject = user.id, expired = false) {
  return new SignJWT({ sid: 'session_synthetic', email: user.email }).setProtectedHeader({ alg: 'RS256', kid: jwk.kid }).setSubject(subject).setIssuedAt().setExpirationTime(Math.floor(Date.now()/1000) + (expired ? -3600 : 3600)).sign(privateKey);
}
const accessToken = await token();
const sessionCookie = await sealData({ user: { id: user.id, email: user.email, emailVerified: true }, accessToken, refreshToken: 'refresh_synthetic_only' }, { password, ttl: 0 });
const bobCookie = await sealData({ user: { id: 'user_synthetic_b', email: 'qa-b@example.invalid', emailVerified: true }, accessToken: await token('user_synthetic_b'), refreshToken: 'refresh_synthetic_only' }, { password, ttl: 0 });
const collectProfile = process.argv.includes('--profile');
let magicCookie;
let mode = 'normal'; const outbound = []; const unexpected = [];
const bindings = marketingOnly ? { SONDER_SITE_MODE: 'marketing-only', SONDER_WEBSITE_ORIGIN: base, NODE_ENV: 'production' } : { WORKOS_API_KEY: 'sk_test_synthetic_worker_only', WORKOS_CLIENT_ID: client, WORKOS_COOKIE_PASSWORD: password, NEXT_PUBLIC_WORKOS_REDIRECT_URI: base+'/login', SONDER_API_ORIGIN: 'https://customer-api.example.invalid', SONDER_WEBSITE_ORIGIN: base, SANITY_PROJECT_ID: 'qualification-fixture', SANITY_DATASET: 'staging', NODE_ENV: 'production' };
async function dependency(request) {
  const url = new URL(request.url); outbound.push({ host: url.hostname, path: url.pathname, method: request.method });
  if (url.hostname === 'api.workos.com') {
    if (url.pathname.includes('jwks')) return Response.json({ keys: [jwk] });
    if (url.pathname === '/user_management/magic_auth') return mode === 'rate' ? Response.json({ message: 'synthetic rate' }, { status: 429 }) : Response.json({ id: 'magic_synthetic', email: user.email });
    if (url.pathname === '/user_management/authenticate') {
      if(mode==='verifyConfigurationFailure') return Response.json({error:'invalid_request',error_description:'synthetic configuration failure'},{status:400});
      if(mode==='verifyUnavailable') return Response.json({message:'synthetic provider unavailable'},{status:503});
      const body = await request.json();
      if (body.grant_type === 'refresh_token' && mode==='refreshTransient') return Response.json({message:'synthetic transient'},{status:503});
      if (body.grant_type === 'refresh_token' && mode==='refreshAmbiguous') return new Response('{incomplete-success',{headers:{'content-type':'application/json'}});
      if (body.grant_type === 'refresh_token') return mode==='refreshOK' ? Response.json({ access_token: accessToken, refresh_token: 'refresh_rotated_synthetic', user, authentication_method: 'MagicAuth' }) : Response.json({ message: 'synthetic invalid refresh' }, { status: 400 });
      if (body.code !== '123456') return Response.json({ code:'invalid_one_time_code', message: 'synthetic invalid code' }, { status: 400 });
      return Response.json({ access_token: accessToken, refresh_token: 'refresh_synthetic_only', user: mode==='unverified' ? {...user,email_verified:false} : user, authentication_method: 'MagicAuth' });
    }
  }
  if (url.hostname === 'customer-api.example.invalid') {
    const bearer = request.headers.get('authorization');
    assert.ok(bearer?.startsWith('Bearer '));
    if (mode === 'redirect') return new Response(null, { status: 302, headers: { location: 'https://unexpected.example.invalid' } });
    if (mode === 'offline') throw Error('synthetic connectivity loss');
    if (mode === 'malformed') return Response.json({ identityId: 'unexpected', customerId: 'unexpected', secret: 'must-not-render' });
    if (bearer !== `Bearer ${accessToken}`) return Response.json({ error: 'accountUnlinked' }, { status: 403 });
    if (url.pathname === '/v1/customer/session') return Response.json({ identityId: user.id, customerId: 'customer_synthetic_a' });
    if (url.pathname === '/v1/customer/licenses' && request.headers.get('Sonder-Commercial-Profile') === 'mactric-grants-1') return Response.json({profile:'mactric-grants-1',products:[1,2].map(n=>({productId:'mactric',name:'Mactric',grantId:'grant_synthetic_'+n,purchaseId:'purchase_synthetic_'+n,purchasedMajor:1,revision:1,financialState:'paid',entitlement:{status:'active'},license:{status:'active',activationLimit:3,activeActivationCount:0,remainingActivationSlots:3,activations:[]}}))});
    if (url.pathname === '/v1/customer/checkout') {
      assert.equal(request.method,'POST');assert.equal(request.headers.get('Sonder-Commercial-Profile'),'sonder-checkout-1');
      const body=await request.json();assert.deepEqual(Object.keys(body).sort(),['idempotencyKey','offerId']);assert.equal(body.offerId,'mactric-major-1');
      return mode==='checkoutUnknown'?Response.json({error:'checkoutOutcomeUnknown'},{status:503}):Response.json({profile:'sonder-checkout-1',checkoutRequestId:'a'.repeat(43),checkoutUrl:'https://synthetic-store.lemonsqueezy.com/checkout/custom/synthetic-checkout',expiresAt:Math.floor(Date.now()/1000)+300},{status:201});
    }
    if (url.pathname === '/v1/customer/licenses') return Response.json({ products: [] });
    if (/\/v1\/customer\/activations\/[^/]+\/revoke$/.test(url.pathname)) return Response.json({ revoked: true });
    if (/\/v1\/customer\/activation-requests\/[^/]+\/approve$/.test(url.pathname)) return Response.json({error:'activationRequestFinalized'},{status:mode==='activationStatusMismatch'?500:409});
  }
  if (url.hostname === 'qualification-fixture.api.sanity.io') {
    assert.equal(request.headers.get('authorization'),null); assert.equal(request.headers.get('cookie'),null);
    const productId=JSON.parse(url.searchParams.get('$productId'));
    if(mode==='cmsOversize') return new Response('x'.repeat(262145));
    if(mode==='cmsInvalid') return new Response(new Uint8Array([255]));
    return Response.json({result:[{productId,title:'Mactric',tagline:'Synthetic CMS qualification',hero:{description:'Synthetic CMS qualification'},featureSections:[],media:[],faq:[],seo:{}}]});
  }
  unexpected.push({ host: url.hostname, path: url.pathname });
  throw Error('Unapproved outbound request');
}
// Static headers belong to the reviewed build, not a runtime-only test patch.
assert.equal(await readFile(join(output, 'assets/_headers'), 'utf8'), await readFile(join(directory, 'cloudflare/_headers'), 'utf8'));
const runtimeErrors=[];
class QualificationLog extends Log { error(message) { runtimeErrors.push(String(message)); super.error(message); } }
const runtime = new Miniflare(convertV4MiniflareOptions({ rootPath: directory, modulesRoot: bundleDirectory, name: 'sonder-website-local', modules: true, scriptPath: bundled, compatibilityDate: config.compatibility_date, compatibilityFlags: ['nodejs_compat'], bindings, assets: { directory: join(output, 'assets'), binding: 'ASSETS', routerConfig: { has_user_worker: true } }, outboundService: dependency, handleUncaughtError: error => runtimeErrors.push(error.message), cf: false, inspectorPort: collectProfile ? 0 : undefined, verbose: true, log: new QualificationLog(LogLevel.DEBUG) }));
let inspector;
async function connectInspector() {
  const endpoint = await runtime.getInspectorURL();
  const discovery = new URL('/json/list', endpoint); discovery.protocol='http:';
  const targets = await fetch(discovery, { signal: AbortSignal.timeout(3000) }).then(r=>r.json());
  const target = targets.find(t=>String(t.id).includes('sonder-website-local') || String(t.title).includes('sonder-website-local'));
  assert.ok(target?.webSocketDebuggerUrl, 'User Worker inspector target');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen=resolve; socket.onerror=reject; });
  let serial=0; const pending=new Map();
  socket.onmessage=event=>{ const reply=JSON.parse(event.data); const entry=pending.get(reply.id); if(entry){ pending.delete(reply.id); if(reply.error) entry.reject(new Error(reply.error.message)); else entry.resolve(reply.result); } };
  return { socket, call(method,params={}) { return new Promise((resolve,reject)=>{ const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params})); }); } };
}
const results = []; const measurements = [];
let maxOutbound = 0;
async function request(path, init = {}) {
  const count = outbound.length, start = performance.now();
  await inspector?.call('Profiler.start');
  const response = await runtime.dispatchFetch(base+path, { ...init, headers: { host: new URL(base).host, 'x-forwarded-proto': 'https', ...init.headers }, redirect: 'manual', signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  const {profile}=inspector ? await inspector.call('Profiler.stop') : {profile:{nodes:[],samples:[]}};
  const summary=summarizeProfile(profile);
  const heap=inspector ? await inspector.call('Runtime.getHeapUsage') : {};
  const calls = outbound.length-count; maxOutbound = Math.max(maxOutbound, calls);
  measurements.push({ path: path.split('?')[0], status: response.status, wallMs: +(performance.now()-start).toFixed(2), outbound: calls, v8ActiveSampleMs: inspector ? summary.activeSampleMs : null, profileAttribution: inspector ? summary : undefined, usedJsHeapBytes: heap.usedSize, totalJsHeapBytes: heap.totalSize });
  return { response, text };
}
async function check(name, run) { await run(); results.push({ name, result: 'PASS' }); }
const headers = (cookie = sessionCookie) => ({ cookie: `wos-session=${cookie}` });
const csrf = 'synthetic-csrf';
const post = body => ({ method: 'POST', headers: { 'content-type': 'application/json', origin: base, 'x-sonder-csrf': csrf, cookie: `sonder-csrf=${csrf}` }, body: JSON.stringify(body) });
try {
  const readyStart = performance.now(); await runtime.ready; const readyWallMs = performance.now()-readyStart;
  if(collectProfile){ inspector=await connectInspector(); await inspector.call('Profiler.enable'); await inspector.call('Profiler.setSamplingInterval',{interval:1000}); }
  await check('prerendered public HTML and RSC are identical across guest, valid, expired and forged sessions', async () => {
    const expired=await sealData({user:{id:user.id,email:user.email,emailVerified:true},accessToken:await token(user.id,true),refreshToken:'refresh_public_must_not_run'}, {password,ttl:0});
    const prerender=JSON.parse(await readFile(join(directory,'.next/prerender-manifest.json')));
    for(const path of ['/','/apps/mactric']) {
      assert.ok(prerender.routes[path], 'Actual Next prerender record '+path);
      assert.equal(prerender.routes[path].initialRevalidateSeconds,false,'No ISR');
      const start=outbound.length;
      for(const rsc of [false,true]) {
        let first;
        for(const cookie of [null,sessionCookie,bobCookie,expired,'forged']) {
          const h={...(cookie?headers(cookie):{}),...(rsc?{RSC:'1'}:{})};
          const page=await request(path,{headers:h});
          assert.equal(page.response.status,200);assert.equal(page.response.headers.has('set-cookie'),false);
          assert.equal(page.response.headers.get('x-opennext-cache'),'HIT','Native cache interception');
          assert.match(page.response.headers.get('content-type'),rsc?/text\/x-component/:/text\/html/);
          assert.ok(!page.text.includes('user_synthetic')&&!page.text.includes(accessToken)&&!page.text.includes('customer_synthetic'));
          if(first===undefined)first=page.text;else assert.equal(page.text,first,'Public bytes must not depend on session');
          if(!rsc)assert.match(page.text,marketingOnly ? />Account \(not yet available\)<\/a>/ : />Account<\/a>/);
        }
      }
      assert.equal(outbound.length,start,'Public routes never invoke WorkOS/customer/CMS');
    }
  });
  if (marketingOnly) {
    await check('marketing private navigation never invokes WorkOS or customer API, even with stale sessions', async () => {
      const before = outbound.length;
      for (const path of ['/account', '/login?returnTo=/account', '/account/activate/stale-request?code=secret']) {
        for (const h of [{}, headers(), {cookie:'wos-session=corrupt'}]) {
          const page = await request(path, {headers:h});
          assert.equal(page.response.status,307,page.text.slice(0,2000));
          assert.equal(new URL(page.response.headers.get("location"),base).href,base+"/availability");
          assert.match(page.response.headers.get('cache-control'),/no-store/);
          assert.equal(page.response.headers.has('set-cookie'),false);
          assert.ok(!page.text.includes('stale-request')&&!page.text.includes(accessToken));
        }
      }
      const availability=await request('/availability');assert.equal(availability.response.status,200);assert.match(availability.text,/Accounts are not available yet/);
      assert.equal(outbound.length,before);
    });
    await check('marketing API and stale Server Actions deny with typed errors and no session/provider effects', async () => {
      const before = outbound.length;
      for (const [path,init] of [
        ['/api/auth/csrf',{}], ['/api/auth/social/callback?code=secret',{}],
        ['/api/auth/magic/request',post({email:user.email})],
        ['/api/auth/magic/verify',post({email:user.email,code:'123456'})],
        ['/api/account/activation-requests/stale/approve',post({})],
        ['/api/account/activations/stale/revoke',post({})],
        ['/account',{...post({}),headers:{...post({}).headers,'next-action':'stale-action'}}],
      ]) {
        const result=await request(path,init);
        assert.equal(result.response.status,503);
        assert.deepEqual(JSON.parse(result.text),{error:'customerPlatformUnavailable'});
        assert.match(result.response.headers.get('cache-control'),/no-store/);
        assert.equal(result.response.headers.has('set-cookie'),false);
      }
      assert.equal(outbound.length,before);
    });
    await check('public navigation, development status and unknown product remain usable without customer credentials', async () => {
      for (const path of ['/apps','/apps/frame','/apps/crate','/about','/creative','/contact']) {
        const page=await request(path); assert.equal(page.response.status,200);
        assert.match(page.text,/Skip to content/);
        if(path.startsWith('/apps/'))assert.match(page.text,/Not available to purchase or download yet/);
      }
      for(const path of ['/impressum','/datenschutz']){const draft=await request(path);assert.equal(draft.response.status,404);assert.ok(!draft.text.includes('Laurens Karpf')&&!draft.text.includes('OFFEN:'));}
      const absent=await request('/apps/unknown');assert.equal(absent.response.status,404);assert.match(absent.text,/Page not found/);
      assert.equal(outbound.length,0,'Marketing runtime needs no provider/CMS/customer call');
    });
  } else {
  await check('signed-out account, forged internal headers and corrupt cookies cannot grant session', async () => {
    for (const h of [{}, { 'x-workos-session': sessionCookie, 'x-workos-middleware': 'true' }, { cookie: 'wos-session=corrupt' }]) {
      const { response, text } = await request('/account', { headers: h }); assert.equal(response.status, 307, text.slice(-2500)); assert.equal(new URL(response.headers.get('location'), base).href, base+'/login');
    }
  });
  await check('CSRF cookie flags, security headers and no-store', async () => {
    const { response, text } = await request('/api/auth/csrf'); assert.equal(response.status, 200); assert.ok(JSON.parse(text).token);
    const cookie = response.headers.getSetCookie().find(value=>value.startsWith('sonder-csrf=')); for (const flag of ['HttpOnly', 'Secure', 'SameSite=strict']) assert.ok(cookie?.includes(flag), flag);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff'); assert.equal(response.headers.get('x-frame-options'), 'DENY'); assert.match(response.headers.get('cache-control'), /no-store/);
  });
  await check('wrong origin and missing CSRF reject before WorkOS effects', async () => {
    const before = outbound.length;
    for (const h of [{}, { ...post({}).headers, origin: 'https://attacker.invalid' }]) assert.equal((await request('/api/auth/magic/request', { method: 'POST', headers: h, body: '{}' })).response.status, 403);
    assert.equal(outbound.length, before);
  });
  await check('body bounds and invalid code have no enrollment or mail effect', async () => {
    const before = outbound.length;
    assert.equal((await request('/api/auth/magic/request', post({ email: 'x'.repeat(2048) }))).response.status, 400);
    assert.equal((await request('/api/auth/magic/verify', post({ email: user.email, code: 'bad' }))).response.status, 401);
    assert.equal(outbound.length, before);
  });
  await check('Magic request/rate/error and verified saveSession use actual SDK', async () => {
    assert.equal((await request('/api/auth/magic/request', post({ email: user.email }))).response.status, 202);
    mode='rate'; assert.equal((await request('/api/auth/magic/request', post({ email: user.email }))).response.status, 429); mode='normal';
    assert.equal((await request('/api/auth/magic/verify', post({ email: user.email, code: '999999' }))).response.status, 401);
    const { response, text } = await request('/api/auth/magic/verify', post({ email: user.email, code: '123456', returnTo: 'https://attacker.invalid' }));
    assert.equal(response.status, 200); assert.deepEqual(JSON.parse(text),{ok:true}); const cookie=response.headers.getSetCookie().find(value=>value.startsWith('wos-session='));
    for (const flag of ['wos-session=', 'HttpOnly', 'Secure']) assert.ok(cookie?.includes(flag), flag);
    assert.match(cookie.toLowerCase(), /samesite=lax/);
    magicCookie=response.headers.getSetCookie().find(value=>value.startsWith('wos-session='))?.split(';')[0].slice('wos-session='.length);
    assert.ok(magicCookie);
    mode='verifyUnavailable'; const unavailable=await request('/api/auth/magic/verify',post({email:user.email,code:'123456'})); assert.equal(unavailable.response.status,503); assert.deepEqual(JSON.parse(unavailable.text),{error:'temporarilyUnavailable'}); assert.ok(!unavailable.response.headers.getSetCookie().some(value=>value.startsWith('wos-session=')));
    mode='verifyConfigurationFailure'; const misconfigured=await request('/api/auth/magic/verify',post({email:user.email,code:'123456'})); assert.equal(misconfigured.response.status,503); assert.deepEqual(JSON.parse(misconfigured.text),{error:'temporarilyUnavailable'}); assert.ok(!misconfigured.response.headers.getSetCookie().some(value=>value.startsWith('wos-session=')));
    mode='unverified'; const unverified=await request('/api/auth/magic/verify',post({email:user.email,code:'123456'})); assert.equal(unverified.response.status,403); assert.ok(!unverified.response.headers.get('set-cookie')?.includes('wos-session=')); mode='normal';
  });
  await check('saved Magic session round-trips through real AuthKit verification',async()=>{ const result=await request('/account',{headers:headers(magicCookie)}); assert.equal(result.response.status,200); assert.match(result.text,/Manage the activations/); });
  await check('expired signed sessions deny on failed refresh and recover only after verified refresh',async()=>{
    const expired=await sealData({user:{id:user.id,email:user.email,emailVerified:true},accessToken:await token(user.id,true),refreshToken:'refresh_synthetic_only'},{password,ttl:0});
    const start=outbound.length; const r=await request('/account',{headers:headers(expired)}); assert.equal(r.response.status,307); assert.ok(!outbound.slice(start).some(x=>x.host==='customer-api.example.invalid'));
    mode='refreshOK'; const recovered=await request('/account',{headers:headers(expired)}); mode='normal'; assert.equal(recovered.response.status,200); assert.match(recovered.text,/Manage the activations/); assert.ok(recovered.response.headers.getSetCookie().some(value=>value.startsWith('wos-session=')));
  });
  await check('expired transient and ambiguous refresh preserve cookies without authenticating or reading customer data',async()=>{
    for(const value of ['refreshTransient','refreshAmbiguous']){
      mode=value;const expired=await sealData({user:{id:user.id,email:user.email,emailVerified:true},accessToken:await token(user.id,true),refreshToken:'refresh_'+value},{password,ttl:0});
      const start=outbound.length;const r=await request('/account',{headers:headers(expired)});assert.equal(r.response.status,307);
      assert.ok(!r.response.headers.getSetCookie().some(c=>c.startsWith('wos-session=;')),'uncertain refresh must preserve the sealed session');
      assert.ok(!outbound.slice(start).some(x=>x.host==='customer-api.example.invalid'));
    }
    mode='normal';
  });
  await check('terminal invalid-grant refresh clears expired session without customer effects',async()=>{
    const expired=await sealData({user:{id:user.id,email:user.email,emailVerified:true},accessToken:await token(user.id,true),refreshToken:'refresh_terminal'},{password,ttl:0});
    const start=outbound.length;const r=await request('/account',{headers:headers(expired)});assert.equal(r.response.status,307);assert.ok(r.response.headers.getSetCookie().some(c=>c.startsWith('wos-session=;')));assert.ok(!outbound.slice(start).some(x=>x.host==='customer-api.example.invalid'));
  });
  let account;
  await check('sealed verified session reaches server API; account has no private identifiers', async () => {
    account=await request('/account', { headers: headers() }); assert.equal(account.response.status, 200); assert.match(account.text, /Manage the activations/);
    assert.ok(!account.text.includes('customer_synthetic_a')); assert.ok(!account.text.includes(accessToken));
    assert.match(account.response.headers.get('cache-control'), /no-store/);
    assert.ok(!account.response.headers.has('x-workos-session'));
  });
  await check('second subject cannot read linked customer; no licensing read follows denial', async () => {
    const start=outbound.length; const { text }=await request('/account', { headers: headers(bobCookie) }); assert.match(text, /no sonder customer account/);
    assert.ok(!outbound.slice(start).some(x=>x.path==='/v1/customer/licenses'));
  });
  await check('API redirects, outage and malformed ownership fail closed', async () => {
    for (const value of ['redirect', 'offline', 'malformed']) { mode=value; const { text }=await request('/account',{headers:headers()}); assert.match(text,/could not confirm account access/); assert.ok(!text.includes('must-not-render')); }
    mode='normal';
  });
  await check('browser approval preserves authoritative error status and rejects contradictory terminal spelling',async()=>{
    for(const [value,status,error] of [['activationStatusMismatch',503,'licensingUnavailable'],['activationStatusCorrect',409,'activationRequestFinalized']]){
      mode=value;
      const init=post({});init.headers.cookie+='; wos-session='+sessionCookie;
      const r=await request('/api/account/activation-requests/'+'A'.repeat(43)+'/approve',init);
      assert.equal(r.response.status,status);assert.deepEqual(JSON.parse(r.text),{error});
      assert.match(r.response.headers.get('cache-control'),/no-store/);
    }
    mode='normal';
  });
  await check('same-origin authenticated revoke and unauthenticated denial', async () => {
    const path='/api/account/activations/'+ 'a'.repeat(43) +'/revoke';
    const p=post({}); assert.equal((await request(path,p)).response.status,401);
    p.headers.cookie += `; wos-session=${sessionCookie}`;
    assert.equal((await request(path,p)).response.status,200);
  });
  await check('production social/callback is excluded and cannot be enabled by URL inputs',async()=>{
    const start=outbound.length;
    assert.equal((await request('/api/auth/social/callback?code=forged&state=forged')).response.status,404);
    assert.equal((await request('/api/auth/social/google/start', post({}))).response.status,404);
    assert.equal((await request('/api/auth/social/google/start')).response.status,405);
    assert.equal(outbound.length,start);
  });
  await check('canonical redirect and public static assets remain available',async()=>{
    assert.equal((await request('/products/mactric')).response.status,308);
    const asset=await request('/sonder-wordmark.svg'); assert.equal(asset.response.status,200); assert.match(asset.text,/<svg/); assert.equal(asset.response.headers.get('x-content-type-options'),'nosniff');
    const files=await readdir(join(output,'assets/_next/static'),{recursive:true}); const js=files.find(name=>name.endsWith('.js')); assert.ok(js);
    const start=outbound.length; const cached=await request('/_next/static/'+js); assert.equal(cached.response.status,200); assert.match(cached.response.headers.get('cache-control'),/immutable/); assert.equal(outbound.length,start);
    const page=await request('/apps/mactric'); assert.equal(page.response.status,200); assert.match(page.text,/Mactric/);assert.ok(!page.text.includes('Synthetic CMS qualification'));assert.equal(page.response.headers.get('x-opennext-cache'),'HIT');
  });
  await check('public build snapshot ignores runtime CMS changes and simulated history/RSC return after account',async()=>{
    const start=outbound.length;
    for(const value of ['cmsOversize','cmsInvalid']) { mode=value; const page=await request('/apps/mactric',{headers:headers()}); assert.equal(page.response.status,200); assert.ok(!page.text.includes('Synthetic CMS qualification')); assert.match(page.text,/Mactric/); assert.equal(page.response.headers.has('set-cookie'),false); assert.equal(page.response.headers.get('x-opennext-cache'),'HIT'); }
    mode='normal';assert.equal(outbound.length,start);
    const guest=await request('/');const returnVisit=await request('/',{headers:{...headers(),RSC:'1','Next-Router-Prefetch':'1'}});
    assert.equal(guest.response.status,200);assert.equal(returnVisit.response.status,200);assert.equal(returnVisit.response.headers.has('set-cookie'),false);
    assert.equal(outbound.length,start);
  });
  await check('actual signout server action clears session cookie without replay',async()=>{
    const id=account.text.match(/name="\$ACTION_ID_([^\"]+)"/)?.[1]; assert.ok(id,'Signout action identifier');
    const boundary='sonder-local-action-boundary';
    const form = () => `--${boundary}\r\nContent-Disposition: form-data; name="$ACTION_ID_${id}"\r\n\r\n\r\n--${boundary}--\r\n`;
    const formHeaders={'content-type':'multipart/form-data; boundary='+boundary};
    const before=outbound.length;
    const cross=await request('/account',{method:'POST',headers:{...headers(),...formHeaders,origin:'https://attacker.invalid'},body:form()});
    assert.equal(cross.response.status,403);
    assert.ok(!cross.response.headers.get('set-cookie')?.includes('wos-session=;'));
    assert.equal(outbound.length,before);
    const r=await request('/account',{method:'POST',headers:{...headers(),...formHeaders,origin:base},body:form()});
    assert.equal(r.response.status,303); assert.match(r.response.headers.get('set-cookie'),/wos-session=;/);
    assert.equal((await request('/account')).response.status,307);
  });
  await check('noncanonical WorkOS configuration denies before AuthKit refresh or route provider work',async()=>{
    const before=outbound.length;
    const isolated=new Miniflare(convertV4MiniflareOptions({rootPath:directory,modulesRoot:bundleDirectory,name:'wrong-workos-origin-local',modules:true,scriptPath:bundled,compatibilityDate:config.compatibility_date,compatibilityFlags:['nodejs_compat'],bindings:{...bindings,WORKOS_API_HOSTNAME:'synthetic-redirect.example.invalid'},outboundService:dependency,cf:false,log:new QualificationLog(LogLevel.DEBUG)}));
    try {
      await isolated.ready;
      for(const [path,init] of [['/account',{headers:headers()}],['/api/auth/magic/verify',post({email:user.email,code:'123456'})]]) {
        const response=await isolated.dispatchFetch(base+path,init);
        assert.equal(response.status,503);assert.match(response.headers.get('cache-control'),/no-store/);
        assert.equal(response.headers.has('set-cookie'),false);assert.equal((await response.json()).error,'temporarilyUnavailable');
      }
      assert.equal(outbound.length,before);
    }finally{await isolated.dispose();}
  });
  await check('explicit synthetic preview composes purchase-scoped account reads, checkout relay and read-only return without legacy fallback',async()=>{
    const preview=new Miniflare(convertV4MiniflareOptions({rootPath:directory,modulesRoot:bundleDirectory,name:'customer-product-preview-local',modules:true,scriptPath:bundled,compatibilityDate:config.compatibility_date,compatibilityFlags:['nodejs_compat'],bindings:{...bindings,VERCEL_ENV:'preview',SONDER_RELEASE_SCOPE:'historical-staging',SONDER_CUSTOMER_LICENSE_PROFILE:'mactric-grants-1',SONDER_CHECKOUT_PROFILE:'sonder-checkout-1',SONDER_CHECKOUT_ORIGIN:'https://synthetic-store.lemonsqueezy.com'},assets:{directory:join(output,'assets'),binding:'ASSETS',routerConfig:{has_user_worker:true}},outboundService:dependency,cf:false,log:new QualificationLog(LogLevel.DEBUG)}));
    try {
      await preview.ready;
      const read=async(path,init={})=>{const r=await preview.dispatchFetch(base+path,{...init,headers:{host:new URL(base).host,'x-forwarded-proto':'https',...init.headers},redirect:'manual'});return {response:r,text:await r.text()};};
      const account=await read('/account',{headers:headers()});assert.equal(account.response.status,200);assert.match(account.text,/Purchase 1/);assert.match(account.text,/Purchase 2/);assert.ok(!account.text.includes(accessToken)&&!account.text.includes('customer_synthetic_a'));assert.match(account.text,/Test Mactric checkout/);
      const form=await read('/account/checkout/mactric-major-1',{headers:headers()});assert.equal(form.response.status,200);assert.match(form.text,/Continue to test checkout/);
      const init=post({offerId:'mactric-major-1',idempotencyKey:'synthetic-checkout-runtime-key'});init.headers.cookie+='; wos-session='+sessionCookie;
      const checkout=await read('/api/account/checkout',init);assert.equal(checkout.response.status,201);assert.deepEqual(Object.keys(JSON.parse(checkout.text)).sort(),['checkoutRequestId','checkoutUrl','expiresAt']);
      mode='checkoutUnknown';const unknown=await read('/api/account/checkout',init);mode='normal';assert.equal(unknown.response.status,503);assert.deepEqual(JSON.parse(unknown.text),{error:'checkoutOutcomeUnknown'});
      const before=outbound.filter(x=>x.host==='customer-api.example.invalid').length;
      for(const path of ['/account/checkout/return?paid=true&customerId=forged','/account/checkout/cancelled']){const r=await read(path,{headers:headers()});assert.equal(r.response.status,200);assert.ok(!r.text.replace(/<script\b[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,'').includes('forged'));assert.match(r.text,/Check account status/);}
      assert.equal(outbound.filter(x=>x.host==='customer-api.example.invalid').length,before,'Return/cancel do not mutate or infer an entitlement');
    }finally{mode='normal';await preview.dispose();}
  });
  await check('closed staging configuration omits app admission and cannot reach providers',async()=>{
    const before=outbound.length;
    const closed=new Miniflare(convertV4MiniflareOptions({rootPath:directory,modulesRoot:bundleDirectory,name:'closed-local-qualification',modules:true,scriptPath:bundled,compatibilityDate:config.compatibility_date,compatibilityFlags:['nodejs_compat'],bindings:{},outboundService:dependency,cf:false,log:new QualificationLog(LogLevel.DEBUG)}));
    try {
      await closed.ready;
      for(const [path,init] of [['/account',{}],['/api/auth/magic/request',post({email:user.email})]]) {
        const response=await closed.dispatchFetch(base+path,init);assert.equal(response.status,503);assert.match(response.headers.get('cache-control'),/no-store/);await response.text();
      }
      assert.equal(outbound.length,before);
    }finally{await closed.dispose();}
  });
  }
  assert.deepEqual(unexpected,[]);
  assert.deepEqual(runtimeErrors,[],'Unhandled runtime errors invalidate qualification');
  const assetFiles=[];
  async function walk(p) {for(const e of await readdir(p,{withFileTypes:true})){const f=join(p,e.name);if(e.isDirectory())await walk(f);else assetFiles.push((await stat(f)).size);}}
  await walk(join(output,'assets'));
  await writeFile(join(directory,collectProfile?'qualification-profile-results.json':'qualification-results.json'),JSON.stringify({evidence:'local-workerd-synthetic-only',runtimeDisposition:'PASS: functional assertions and captured runtime diagnostics',results,measurements,resources:{bundleBytes:bundle.length,gzipBytes:gzipSync(bundle).length,bundleSHA256:createHash('sha256').update(bundle).digest('hex'),readyWallMs,staticAssetFiles:assetFiles.length,maxAssetBytes:Math.max(...assetFiles),maximumObservedOutboundSubrequests:maxOutbound,cpuProviderAccounting:'UNMEASURED; V8 active wall-samples are estimates including profiler overhead, not Free-plan CPU accounting',isolateMemoryProviderAccounting:'UNMEASURED; Runtime.getHeapUsage is JS heap only, not full isolate/native memory'},unexpectedOutbound:unexpected.length},null,2));
  console.log(JSON.stringify({cases:results.length,result:'PASS',directory,maxOutbound}));
} finally { inspector?.socket.close(); await runtime.dispose(); }
