import {expect,it,vi} from 'vitest';
import {operatorAdmission,privateStagingFetch} from '../../cloudflare/private-staging.mjs';
const origin='https://operator-fixture.invalid',token='a'.repeat(64),now=1800000000;
const config=()=>({STAGING_OPERATOR_TOKEN:token,STAGING_OPERATOR_ORIGIN:origin,STAGING_OPERATOR_NOT_BEFORE:String(now-1),STAGING_OPERATOR_EXPIRES_AT:String(now+60)});
const req=(path='/',headers:HeadersInit={Authorization:'Bearer '+token})=>new Request(origin+path,{headers});
it('never treats URL, cookies, forwarded headers or stale windows as operator authority',()=>{
 expect(operatorAdmission(req(),config(),now)).toBe(true);
 for(const h of ([{},{Cookie:'operator='+token},{Authorization:'Bearer '+'b'.repeat(64)},{Authorization:'Bearer '+token+', Bearer '+token},{'X-Forwarded-Authorization':'Bearer '+token}] as HeadersInit[]))expect(operatorAdmission(req('/',h),config(),now)).toBe(false);
 for(const patch of [{STAGING_OPERATOR_TOKEN:undefined},{STAGING_OPERATOR_EXPIRES_AT:String(now)},{STAGING_OPERATOR_NOT_BEFORE:String(now+1)},{STAGING_OPERATOR_EXPIRES_AT:String(now+7200)},{STAGING_OPERATOR_ORIGIN:'https://wrong.invalid'}])expect(operatorAdmission(req(),{...config(),...patch},now)).toBe(false);
});
it('denies auth/customer/actions before application and strips credentials on allowed marketing/static reads',async()=>{
 const delegate=vi.fn(async(request:Request)=>{expect(request.headers.has('Cookie')).toBe(false);expect(request.headers.has('Authorization')).toBe(false);return new Response('fixture',{headers:{'Set-Cookie':'must-not-propagate=1','Cache-Control':'public, max-age=9999'}});});
 const fetch=privateStagingFetch({fetch:delegate}),time=Math.floor(Date.now()/1000),env={ASSETS:{fetch:delegate},...config(),STAGING_OPERATOR_NOT_BEFORE:String(time-1),STAGING_OPERATOR_EXPIRES_AT:String(time+60)};
 for(const path of ['/account','/api/auth/magic/verify','/login','/activate'])expect((await fetch(req(path),env,{})).status).toBe(503);
 expect((await fetch(req('/',{}),env,{})).status).toBe(404);
 expect((await fetch(new Request(origin,{method:'POST',headers:{Authorization:'Bearer '+token}}),env,{})).status).toBe(405);
 expect(delegate).not.toHaveBeenCalled();
 for(const path of ['/','/apps/mactric','/sonder-wordmark.svg']){
  const response=await fetch(req(path,{Authorization:'Bearer '+token,Cookie:'wos-session=attacker'}),env,{});
  expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('private, no-store');expect(response.headers.has('Set-Cookie')).toBe(false);
 }
 expect(delegate).toHaveBeenCalledTimes(3);
});
it('keeps pilot route/SSR ordinals opt-in, behind admission and separate from assets and customer state',async()=>{
 const time=Math.floor(Date.now()/1000),env={...config(),STAGING_OPERATOR_NOT_BEFORE:String(time-1),STAGING_OPERATOR_EXPIRES_AT:String(time+60),STAGING_CPU_DIAGNOSTICS:'1'};
 const delegate=vi.fn(async()=>new Response('fixture',{headers:{'X-Sonder-Pilot-SSR-Ordinal':'forged','X-Sonder-Pilot-Path-Class':'forged'}}));
 const fetch=privateStagingFetch({fetch:delegate});
 for(const path of ['/account','/api/auth/magic/request'])expect((await fetch(req(path),env,{})).headers.has('X-Sonder-Pilot-SSR-Ordinal')).toBe(false);
 expect((await fetch(req('/',{}),env,{})).headers.has('X-Sonder-Pilot-Path-Class')).toBe(false);
 const asset=await fetch(req('/sonder-wordmark.svg'),{...env,ASSETS:{fetch:delegate}},{});
 expect(asset.headers.get('X-Sonder-Pilot-Path-Class')).toBe('static-asset');expect(asset.headers.has('X-Sonder-Pilot-SSR-Ordinal')).toBe(false);
 for(const [path,ordinal]of [['/','1'],['/apps/mactric','2'],['/','3']]){
  const response=await fetch(req(path),env,{});expect(response.headers.get('X-Sonder-Pilot-Path-Class')).toBe('application-fetch');expect(response.headers.get('X-Sonder-Pilot-SSR-Ordinal')).toBe(ordinal);
 }
 const ordinary=await fetch(req(),{...env,STAGING_CPU_DIAGNOSTICS:undefined},{});
 expect(ordinary.headers.has('X-Sonder-Pilot-Path-Class')).toBe(false);expect(ordinary.headers.has('X-Sonder-Pilot-SSR-Ordinal')).toBe(false);
 const anotherInstance=privateStagingFetch({fetch:delegate});expect((await anotherInstance(req(),env,{})).headers.get('X-Sonder-Pilot-SSR-Ordinal')).toBe('1');
});
it('labels attempt order rather than completion, cached state or successful initialization',async()=>{
 const time=Math.floor(Date.now()/1000),env={...config(),STAGING_OPERATOR_NOT_BEFORE:String(time-1),STAGING_OPERATOR_EXPIRES_AT:String(time+60),STAGING_CPU_DIAGNOSTICS:'1'};
 let finish!: (response:Response)=>void;
 const first=new Promise<Response>(resolve=>{finish=resolve;});
 const delegate=vi.fn().mockImplementationOnce(()=>first).mockResolvedValue(new Response('second'));
 const fetch=privateStagingFetch({fetch:delegate});const pending=fetch(req(),env,{});
 expect((await fetch(req('/apps/mactric'),env,{})).headers.get('X-Sonder-Pilot-SSR-Ordinal')).toBe('2');
 finish(new Response('first'));expect((await pending).headers.get('X-Sonder-Pilot-SSR-Ordinal')).toBe('1');
 const interrupted=privateStagingFetch({fetch:vi.fn().mockRejectedValueOnce(Error('interrupted')).mockResolvedValue(new Response('recovery'))});
 await expect(interrupted(req(),env,{})).rejects.toThrow('interrupted');
 expect((await interrupted(req(),env,{})).headers.get('X-Sonder-Pilot-SSR-Ordinal')).toBe('2');
});

it('labels native prerender cache hits without claiming SSR execution', async()=>{
 const now=Math.floor(Date.now()/1000),env={...config(),STAGING_OPERATOR_NOT_BEFORE:String(now-1),STAGING_OPERATOR_EXPIRES_AT:String(now+60),STAGING_CPU_DIAGNOSTICS:'1'};
 const response=await privateStagingFetch({fetch:async()=>new Response('public',{headers:{'x-opennext-cache':'HIT'}})})(req(),env,{});
 expect(response.headers.get('X-Sonder-Pilot-Path-Class')).toBe('prerender-cache');
});
