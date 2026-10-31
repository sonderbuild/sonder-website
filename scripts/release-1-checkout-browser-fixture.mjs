/** Loopback-only UI qualification. Actual CheckoutForm, synthetic HTTP boundary;
 * no Next transport, WorkOS, Lemon, storage, purchase or staging acceptance. */
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler'));
const {build}=wranglerRequire('esbuild');
const entry=`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {CheckoutForm} from './src/app/account/checkout/checkout-form.tsx';
let notify=()=>{},posts=0;const ledger=[];
window.fetch=async(path,init={})=>{
 if(path==='/api/auth/csrf')return Response.json({token:'synthetic-csrf'});
 if(path==='/api/account/checkout'){
  posts++;ledger.push('POST /api/account/checkout');notify();
  const body=JSON.parse(init.body);if(Object.keys(body).sort().join()!=='idempotencyKey,offerId')throw Error('unexpected input');
  return Response.json({error:'checkoutOutcomeUnknown'},{status:503});
 }
 throw Error('External request forbidden by local fixture');
};
function App(){const [,update]=useState(0);const [run,setRun]=useState(0);notify=()=>update(n=>n+1);
 return <main><h1>Release 1 checkout UI fixture</h1><p>Actual component; synthetic same-origin fetch only. No payment, provider or staging evidence.</p><button onClick={()=>{posts=0;ledger.length=0;setRun(n=>n+1);}}>Reset synthetic scenario</button><CheckoutForm key={run} offerId="mactric-major-1"/><p role="status">Checkout POST count: {posts}</p><pre>{ledger.join('\\n')}</pre></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
`;
const bundle=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'}});
const html='<!doctype html><html lang="en"><meta charset="utf-8"><title>Release 1 synthetic checkout UI</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px system-ui;max-width:800px;margin:2rem auto;padding:1rem}button{font:inherit;padding:.6rem;margin:.5rem 0}button:focus-visible{outline:3px solid blue}p{line-height:1.6}pre{white-space:pre-wrap}</style><div id="root"></div><script src="/fixture.js"></script></html>';
const server=createServer((req,res)=>{
 if(req.method!=='GET'){res.writeHead(405).end();return;}
 if(req.url==='/fixture.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end(bundle.outputFiles[0].text);return;}
 if(req.url!=='/'){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'}).end(html);
});
server.listen(4321,'127.0.0.1',()=>console.log('SYNTHETIC_UI_ONLY http://127.0.0.1:4321'));
process.on('SIGTERM',()=>server.close());
