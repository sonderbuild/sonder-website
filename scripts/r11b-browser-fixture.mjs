// Local-only mounted-component evidence. No website routes or auth bypasses.
// Run: node scripts/r11b-browser-fixture.mjs; stop with Ctrl-C.
import { createServer } from 'node:http';
import { readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const packages = await readdir(resolve('node_modules/.pnpm'));
const { build } = require(resolve('node_modules/.pnpm', packages.find(name => name.startsWith('esbuild@')), 'node_modules/esbuild'));
const entry = String.raw`
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ActivationManagement} from './src/app/account/activation-management';
import {customerLicensing} from './src/lib/customer-licensing';
const fixture = {read:'ready', revoke:'success', log:[], pending:[], notify:()=>{}, refresh:()=>{}};
const products = labels => [{productId:'monitor',name:'Monitor',entitlement:{status:'active'},license:{status:'active',activationLimit:8,activeActivationCount:labels.length,remainingActivationSlots:8-labels.length,activations:labels.map((deviceLabel,index)=>({activationId:'fixture-'+index,deviceLabel,activatedAt:'2026-10-01T12:00:00Z',lastSeenAt:null,status:'active'}))}}];
let serverProducts = products(['MacBook Pro','Studio Mac','Studio Mac',null]);
const record = text => {fixture.log.push(text); fixture.notify();};
const response = (body,status=200)=>Response.json(body,{status});
window.fetch = async (input,options={}) => {
  const url = new URL(String(input),location.origin);
  const method = options.method || 'GET';
  record(method+' '+url.pathname);
  if(url.pathname==='/v1/customer/licenses' && method==='GET') {
    const mode=fixture.read;
    if(mode==='network') throw new TypeError('Synthetic network loss');
    const result = mode==='unauthenticated' ? response({error:mode},401)
      : ['accountUnlinked','accountDisabled','emailNotVerified'].includes(mode) ? response({error:mode},403)
      : mode==='unavailable' ? response({error:'licensingUnavailable'},503)
      : response({products:mode==='empty'?[]:structuredClone(serverProducts),additiveFixture:true});
    if(mode==='delayed') return new Promise(resolve=>{fixture.pending.push(()=>resolve(result));fixture.notify();});
    return result;
  }
  if(url.origin!==location.origin) throw new Error('External request blocked');
  if(url.pathname==='/api/auth/csrf' && method==='GET') return response({token:'synthetic-csrf'});
  if(/^\/api\/account\/activations\/fixture-\d+\/revoke$/.test(url.pathname) && method==='POST') {
    const mode=fixture.revoke;
    const id=url.pathname.split('/')[4];
    if(mode==='denied') return response({error:'activationUnavailable'},404);
    if(mode==='success'||mode==='lost-applied'||mode==='delayed') {
      serverProducts=structuredClone(serverProducts);
      const license=serverProducts[0].license;
      license.activations=license.activations.filter(a=>a.activationId!==id);
      license.activeActivationCount=license.activations.length;license.remainingActivationSlots=8-license.activations.length;
    }
    if(mode==='lost-applied'||mode==='lost-unchanged') throw new TypeError('Synthetic lost mutation response');
    if(mode==='delayed') return new Promise(resolve=>{fixture.pending.push(()=>resolve(response({revoked:true})));fixture.notify();});
    return response({revoked:true});
  }
  throw new Error('Unexpected request blocked: '+method+' '+url.pathname);
};
window.fixtureRead=()=>customerLicensing('synthetic-not-a-credential');
window.fixtureRouter={refresh:()=>fixture.refresh()};
function App(){
  const [run,setRun]=useState(0);const [data,setData]=useState();const [mounted,setMounted]=useState(true);const [,update]=useState(0);
  fixture.notify=()=>flushSync(()=>update(value=>value+1));
  fixture.refresh=async()=>setData(await window.fixtureRead());
  async function reset(mode){
    fixture.read='ready';fixture.revoke='success';
    serverProducts=products(mode==='duplicates'?['MacBook Pro','Studio Mac','Studio Mac',null]:['Travel Mac']);
    const result=await window.fixtureRead();fixture.log=[];setMounted(true);if(mode!=='new')setRun(value=>value+1);
    setData(mode==='initial-error'?{kind:'error',error:'licensingUnavailable'}:result);
  }
  return <><h1>R11B isolated browser fixture</h1><p>Real component and licensing parser; synthetic action/router/auth and fetch. No external requests. Not Next transport or staging evidence.</p>
  <fieldset><legend>Fixture controls</legend>
  <button onClick={()=>reset('duplicates')}>Load device fixtures</button>{' '}
  <button onClick={()=>reset('initial-error')}>Load initial failure</button>{' '}
  <button onClick={()=>reset('new')}>Replace server list</button>{' '}
  <button onClick={()=>setMounted(false)}>Unmount account</button>{' '}
  <label>Read response <select value={fixture.read} onChange={e=>{fixture.read=e.target.value;fixture.notify();}}>{['ready','empty','network','delayed','unauthenticated','accountUnlinked','accountDisabled','emailNotVerified','unavailable'].map(value=><option key={value}>{value}</option>)}</select></label>{' '}
  <label>Revoke response <select value={fixture.revoke} onChange={e=>{fixture.revoke=e.target.value;fixture.notify();}}>{['success','denied','lost-applied','lost-unchanged','delayed'].map(value=><option key={value}>{value}</option>)}</select></label>{' '}
  <button disabled={!fixture.pending.length} onClick={()=>{fixture.pending.shift()?.();fixture.notify();}}>Release delayed response</button>
  </fieldset><main><h2>Account activations</h2>{mounted&&data&&<ActivationManagement key={run} products={data.kind==='ready'?data.products:empty} initialError={data.kind==='error'?data.error:undefined}/>}</main>
  <h2>Fixture request ledger</h2><pre>{fixture.log.join('\n')||'No requests'}</pre><p>Pending fixture responses: {fixture.pending.length}</p><a href='#top'>End of fixture</a></>;
}
const empty=[];
createRoot(document.getElementById('root')).render(<App/>);
`;
const bundle = await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"','process.env.SONDER_API_ORIGIN':'"https://fixture.invalid"'},plugins:[{name:'local-boundaries',setup(builder){
  builder.onResolve({filter:/^\.\/actions$/},args=>args.importer.endsWith('/account/activation-management.tsx')?{path:'action',namespace:'fixture'}:undefined);
  builder.onResolve({filter:/^next\/navigation$/},()=>({path:'router',namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='action'?'export const refreshActivationStatus=()=>window.fixtureRead();':'export const useRouter=()=>window.fixtureRouter;',loader:'js'}));
}}]});
const html = '<!doctype html><html lang="en"><meta charset="utf-8"><title>R11B local browser fixture</title><style>body{font:16px system-ui;max-width:960px;margin:2rem auto;padding:1rem}button,select{font:inherit;margin:.3rem}li{margin:1rem 0}fieldset{border:1px solid #888}button:focus-visible,a:focus-visible,select:focus-visible{outline:3px solid blue}pre{white-space:pre-wrap}</style><div id="root"></div><script src="/fixture.js"></script></html>';
const server=createServer((req,res)=>{
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; base-uri 'none'; form-action 'none'");
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'||!['/','/fixture.js'].includes(req.url)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');
  res.end(req.url==='/fixture.js'?bundle.outputFiles[0].contents:html);
});
server.listen(4317,'127.0.0.1',()=>console.log('R11B component fixture: http://127.0.0.1:4317 (loopback only; Ctrl-C to stop)'));
