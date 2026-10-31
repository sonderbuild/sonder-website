/** Finite local workerd checks; profiles are diagnostic wall samples, not hosted CPU. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire,SourceMap} from 'node:module';
import {readFile,writeFile,realpath,readdir,stat} from 'node:fs/promises';
import {join,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {summarizeProfile} from './profile-summary.mjs';

if(!process.argv.includes('--runtime-child')){
 const child=spawnSync(process.execPath,[fileURLToPath(import.meta.url),...process.argv.slice(2),'--runtime-child'],{encoding:'utf8',timeout:180000,maxBuffer:4194304});
 process.stdout.write(child.stdout??'');process.stderr.write(child.stderr??'');
 if(child.error)throw child.error;
 if(/Uncaught|uncaught exception|UnhandledPromiseRejection/.test((child.stdout??'')+(child.stderr??'')))process.exit(1);
 process.exit(child.status??1);
}
const args=process.argv.slice(3).filter(x=>x!=='--runtime-child');
assert.ok(args.every(x=>x==='--profile'||x==='--timings'||/^--first-ssr=(home|product)$/.test(x)||x.startsWith('--qualified-source=')),'Unknown diagnostic option');
const profiling=args.includes('--profile'),measuring=profiling||args.includes('--timings'),productFirst=args.includes('--first-ssr=product');
assert.ok(measuring||!args.length,'Diagnostic options require --profile or --timings');
const require=createRequire(import.meta.url),r=createRequire(require.resolve('wrangler'));
const {Miniflare,convertV4MiniflareOptions}=r('miniflare');
const directory=await realpath(resolve(process.argv[2]??'MISSING_PACKAGE'));
const temporaryRoot=await realpath(tmpdir());
assert.ok(directory.startsWith(temporaryRoot+sep)&&directory.split(sep).at(-1).startsWith('sonder-private-staging-'));
assert.ok(!(await readdir(directory)).some(x=>x.startsWith('.env')||x.startsWith('.dev.vars')),'No provider environment files');
const manifest=JSON.parse(await readFile(join(directory,'private-staging-artifact.json'),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.deepEqual(Object.keys(manifest.modules).sort(),['private-staging-worker.mjs','private-staging.mjs','worker.mjs']);
for(const [file,hash] of Object.entries(manifest.modules))assert.equal(sha(await readFile(join(directory,file))),hash);
for(const asset of manifest.assets)assert.equal(sha(await readFile(join(directory,'assets',asset.path))),asset.sha256);
let sourceMap,sourceMapSHA256;
const scriptModules=new Map();
const sourceArg=args.find(x=>x.startsWith('--qualified-source='));
if(sourceArg){
 assert.ok(profiling,'Source map is only used with --profile');
 const source=await realpath(resolve(sourceArg.slice('--qualified-source='.length)));
 assert.ok(source.startsWith(temporaryRoot+sep)&&source.split(sep).at(-1).startsWith('sonder-website-worker-'));
 assert.equal(sha(await readFile(join(source,'qualification-bundle/worker.js'))),manifest.modules['worker.mjs']);
 const path=join(source,'qualification-bundle/worker.js.map');assert.ok((await stat(path)).size<=16*1024*1024);
 const bytes=await readFile(path);sourceMapSHA256=sha(bytes);sourceMap=new SourceMap(JSON.parse(bytes));
}
// Map only to public code categories. Never retain CDP/source URLs, paths, raw
// profile nodes, request headers, or source bodies in the diagnostic report.
function sourceCategory(frame){
 const sourceModule=scriptModules.get(frame.scriptId);
 if(sourceModule==='private-staging.mjs'||sourceModule==='private-staging-worker.mjs')return 'operator-wrapper';
 if(sourceMap&&sourceModule==='worker.mjs'){
  const source=sourceMap.findEntry(frame.lineNumber,frame.columnNumber)?.originalSource??'';
  if(source.includes('server-functions/default/handler.mjs'))return 'next-server-renderer-and-route-loader';
  if(source.includes('middleware/handler.mjs'))return 'opennext-middleware-router';
  if(source.includes('cloudflare/request-boundary.mjs')||source.includes('cloudflare/worker.mjs'))return 'request-boundary';
  if(source.includes('.open-next/'))return 'opennext-dispatch';
  return 'other-mapped-application';
 }
 return 'native-runtime-or-unmapped';
}
const origin='https://operator-fixture.invalid',now=Math.floor(Date.now()/1000),token='a'.repeat(64);let outbound=0;
const runtime=new Miniflare(convertV4MiniflareOptions({name:'private-staging-profile',rootPath:directory,modulesRoot:directory,modules:await Promise.all(['private-staging-worker.mjs','worker.mjs','private-staging.mjs'].map(async name=>({type:'ESModule',path:join(directory,name),contents:await readFile(join(directory,name),'utf8')}))),compatibilityDate:'2026-10-26',compatibilityFlags:['nodejs_compat'],bindings:{WORKOS_CLIENT_ID:'client_closed_staging_not_provider_bound',WORKOS_COOKIE_PASSWORD:'synthetic-cookie-password-closed-staging-only',STAGING_OPERATOR_TOKEN:token,SONDER_WEBSITE_ORIGIN:origin,SONDER_API_ORIGIN:'https://closed-api.example.invalid',STAGING_OPERATOR_ORIGIN:origin,STAGING_OPERATOR_NOT_BEFORE:String(now-1),STAGING_OPERATOR_EXPIRES_AT:String(now+120),...(measuring?{STAGING_CPU_DIAGNOSTICS:'1'}:{})},assets:{directory:join(directory,'assets'),binding:'ASSETS',routerConfig:{has_user_worker:true,invoke_user_worker_ahead_of_assets:true}},outboundService:()=>{outbound++;throw Error('outboundForbidden');},cf:false,inspectorPort:profiling?0:undefined}));
let inspector;
async function connectInspector(){
 const endpoint=await runtime.getInspectorURL(),discovery=new URL('/json/list',endpoint);discovery.protocol='http:';
 const targets=await fetch(discovery,{signal:AbortSignal.timeout(3000)}).then(r=>r.json());
 const target=targets.find(t=>String(t.id).includes('private-staging-profile')||String(t.title).includes('private-staging-profile'));
 assert.ok(target?.webSocketDebuggerUrl,'Exact local Worker inspector');
 const socket=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error('Inspector connect deadline')),5000);socket.onopen=()=>{clearTimeout(timer);ok();};socket.onerror=e=>{clearTimeout(timer);no(e);};});
 let serial=0;const pending=new Map();
 socket.onmessage=e=>{
  const v=JSON.parse(e.data);
  if(v.method==='Debugger.scriptParsed'){
   const url=v.params.url??'';
   const sourceModule=['private-staging-worker.mjs','private-staging.mjs','worker.mjs'].find(name=>url.endsWith('/'+name)||url===name);
   if(sourceModule)scriptModules.set(v.params.scriptId,sourceModule);
  }
  const p=pending.get(v.id);if(p){clearTimeout(p.timer);pending.delete(v.id);if(v.error)p.no(Error('Inspector command failed'));else p.ok(v.result);}
 };
 return {socket,call(method,params={}){return new Promise((ok,no)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);no(Error('Inspector command deadline'));},5000);pending.set(id,{ok,no,timer});socket.send(JSON.stringify({id,method,params}));});},close(){for(const p of pending.values()){clearTimeout(p.timer);p.no(Error('Inspector closed'));}pending.clear();socket.close();}};
}
const results=[];let applicationRequests=0;
try{
 const readyStart=performance.now();await runtime.ready;const readyWallMs=performance.now()-readyStart;
 if(profiling){
  inspector=await connectInspector();
  // Discover script IDs without leaving the debugger active during requests;
  // debugger instrumentation materially distorts cold compilation/rendering.
  await inspector.call('Debugger.enable');await inspector.call('Debugger.disable');
  await inspector.call('Profiler.enable');await inspector.call('Profiler.setSamplingInterval',{interval:1000});
 }
 const denied=[['/','GET',false,404],['/sonder-wordmark.svg','GET',false,404],['/account','GET',true,503],['/api/auth/magic/request','POST',true,405],['/api/auth/magic/request','GET',true,503],['/','POST',true,405]];
 const pages=productFirst?['/apps/mactric','/apps/mactric','/','/']:['/','/','/apps/mactric','/apps/mactric'];
 const assetJS=manifest.assets.find(x=>x.path.startsWith('_next/static/')&&x.path.endsWith('.js'))?.path;
 const assetCSS=manifest.assets.find(x=>x.path.startsWith('_next/static/')&&x.path.endsWith('.css'))?.path;
 assert.ok(assetJS&&assetCSS,'Real compiled JS/CSS assets required');
 const boundaryCases=[
  ['/'+assetJS,'GET',false,404],['/'+assetCSS,'GET',false,404],
  ['/'+assetJS,'GET',true,200],['/'+assetCSS,'GET',true,200],
  ['/index.html','GET',false,404],['/apps/mactric.html','GET',false,404],
  ['/apps/mactric.rsc','GET',false,404],['/cdn-cgi/_next_cache/forged.cache','GET',true,404],
  ['/apps/mactric/','GET',true,404],['/%61ccount','GET',true,404],
  ['/apps/%6dactric','GET',true,404],['/login','GET',false,404],
  ['/?_rsc=synthetic','GET',false,404],['/?_rsc=synthetic','GET',true,200,true],
 ];
 const cases=measuring?[...denied,['/sonder-wordmark.svg','GET',true,200],...pages.map(path=>[path,'GET',true,200])]:[...denied,['/','GET',true,200],['/apps/mactric','GET',true,200],['/sonder-wordmark.svg','GET',true,200],...boundaryCases];
 for(const [path,method,authenticated,expected,rsc] of cases){
  await inspector?.call('Profiler.start');const started=performance.now();
  const response=await runtime.dispatchFetch(origin+path,{method,headers:{host:new URL(origin).host,'x-forwarded-proto':'https',...(authenticated?{Authorization:'Bearer '+token,Cookie:'wos-session=attacker'}:{}),...(rsc?{RSC:'1'}:{})},redirect:'manual',signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,expected,path);if(rsc)assert.match(response.headers.get('content-type'),/text\/x-component/);assert.equal(response.headers.has('Set-Cookie'),false,path);assert.match(response.headers.get('Cache-Control'),/private, no-store/,path);
  let bytes=0;for await(const chunk of response.body){bytes+=chunk.length;assert.ok(bytes<=1048576);}
  const wallMs=performance.now()-started;
  const profile=profiling?(await inspector.call('Profiler.stop')).profile:null;
  const heap=profiling?await inspector.call('Runtime.getHeapUsage'):null;
  const ssr=authenticated&&method==='GET'&&['/','/apps/mactric'].includes(path);if(ssr)applicationRequests++;
  results.push({path,method,authenticated,status:response.status,bytes,...(measuring?{localCompleteBodyWallMs:+wallMs.toFixed(3),pathClass:response.headers.get('X-Sonder-Pilot-Path-Class')??(ssr?'application-fetch':expected===200?'static-asset':'guard-denial'),applicationFetchOrdinal:ssr?applicationRequests:null,responseSSRordinal:response.headers.get('X-Sonder-Pilot-SSR-Ordinal'),...(profiling?{profile:summarizeProfile(profile,sourceCategory),jsHeapOnly:{usedBytes:heap.usedSize,totalBytes:heap.totalSize}}:{})}:{})});
 }
 assert.equal(outbound,0);
 const report={status:'PASS_LOCAL_PRIVATE_MARKETING_ONLY_NOT_HOSTED',artifactManifestSHA256:sha(await readFile(join(directory,'private-staging-artifact.json'))),results,unexpectedOutbound:outbound,realAuthentication:false,realCommercialAdmission:false,...(measuring?{profileEvidence:profiling?'SAMPLED_ACTIVE_WALL_NOT_PROVIDER_CPU; JS_HEAP_NOT_ISOLATE_MEMORY':'UNPROFILED_LOCAL_COMPLETE_BODY_WALL_NOT_CPU',sourceMapSHA256,firstSSR:productFirst?'product':'home',localReadyWallMs:+readyWallMs.toFixed(3)}:{})};
 const name=measuring?`private-staging-${profiling?'profile':'timings'}-${productFirst?'product':'home'}.json`:'private-staging-local-results.json';
 await writeFile(join(directory,name),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:results.length,outbound,report:name}));
}finally{inspector?.close();await runtime.dispose();}
