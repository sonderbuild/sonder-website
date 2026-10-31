import {timingSafeEqual} from 'node:crypto';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const deny=(status,error)=>Response.json({error},{status,headers});
/** Temporary operator-only staging ingress. Not a customer session or a grant
 * of any product, API, provider or recovery authority. No cookie or URL token. */
export function operatorAdmission(request,env,now=Math.floor(Date.now()/1000)){
 const start=Number(env.STAGING_OPERATOR_NOT_BEFORE),end=Number(env.STAGING_OPERATOR_EXPIRES_AT),token=env.STAGING_OPERATOR_TOKEN,origin=env.STAGING_OPERATOR_ORIGIN;
 if(!token||!(/^[a-f0-9]{64}$/).test(token)||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<=0||end<=start||end-start>3600||now<start||now>=end||!origin?.startsWith('https://')||new URL(request.url).origin!==origin)return false;
 const raw=request.headers.get('Authorization');
 return !!raw&&/^Bearer [a-f0-9]{64}$/.test(raw)&&timingSafeEqual(new TextEncoder().encode(raw.slice(7)),new TextEncoder().encode(token));
}
export function privateStagingFetch(application){
 let applicationCalls=0;
 return async(request,env,context)=>{
  if(!operatorAdmission(request,env))return deny(404,'notFound');
  const path=new URL(request.url).pathname;
  if(path.includes('%'))return deny(404,'notFound');
  if(!['GET','HEAD'].includes(request.method))return deny(405,'methodNotAllowed');
  if(/^\/(api|account|auth|login|signout|activate)(\/|$)/.test(path))return deny(503,'temporarilyUnavailable');
  if(!['/','/apps/mactric'].includes(path)&&!path.startsWith('/_next/static/')&&!/\.(svg|png|jpg|webp|ico|css|js|woff2)$/.test(path))return deny(404,'notFound');
  // Real or attacker-supplied sessions cannot trigger middleware refresh/provider
  // effects in this marketing-only pilot. Normal website entry is unchanged.
  const clean=new Request(request);clean.headers.delete('Authorization');clean.headers.delete('Cookie');
  const marketing=['/','/apps/mactric'].includes(path);
  if(!marketing&&!env.ASSETS?.fetch)return deny(503,'temporarilyUnavailable');
  // Diagnostics describe only this isolated pilot instance, never identity or
  // eligibility. No cached response/session and no stable isolate identifier.
  const ordinal=marketing?++applicationCalls:null;
  const response=marketing?await application.fetch(clean,env,context):await env.ASSETS.fetch(clean);
  const resultHeaders=new Headers(response.headers);for(const [key,value] of Object.entries(headers))resultHeaders.set(key,value);
  resultHeaders.delete('Set-Cookie');
  resultHeaders.delete('X-Sonder-Pilot-Path-Class');
  resultHeaders.delete('X-Sonder-Pilot-SSR-Ordinal');
  if(env.STAGING_CPU_DIAGNOSTICS==='1'){
   resultHeaders.set('X-Sonder-Pilot-Path-Class',marketing?(response.headers.get('x-opennext-cache')==='HIT'?'prerender-cache':'application-fetch'):'static-asset');
   if(ordinal!==null)resultHeaders.set('X-Sonder-Pilot-SSR-Ordinal',String(ordinal));
  }
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:resultHeaders});
 };
}
