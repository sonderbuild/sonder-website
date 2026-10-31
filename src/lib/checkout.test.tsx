import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {renderToStaticMarkup} from 'react-dom/server';
const auth=vi.hoisted(()=>({withAuth:vi.fn()}));vi.mock('@workos-inc/authkit-nextjs',()=>auth);
import {POST} from '@/app/api/account/checkout/route';
import {checkoutPreviewAvailable,parseCheckout,requestCheckout,checkoutProfile} from './checkout';
import {checkoutReturnPath} from './checkout-return-path';
import ReturnPage from '@/app/account/checkout/return/page';
import CancelledPage from '@/app/account/checkout/cancelled/page';
const now=Math.floor(Date.now()/1000),requestId='a'.repeat(43),input={offerId:'mactric-major-1',idempotencyKey:'synthetic-idempotency-key'};
const ready={profile:checkoutProfile,checkoutRequestId:requestId,checkoutUrl:'https://checkout.example.invalid/checkout/custom/test',expiresAt:now+300};
const req=(body:unknown=input,csrf=true)=>new NextRequest('https://website.invalid/api/account/checkout',{method:'POST',headers:{Origin:'https://website.invalid','Content-Type':'application/json',...(csrf?{'X-Sonder-Csrf':'synthetic',Cookie:'sonder-csrf=synthetic'}:{})},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('SONDER_WEBSITE_ORIGIN','https://website.invalid');vi.stubEnv('SONDER_API_ORIGIN','https://api.invalid');vi.stubEnv('SONDER_CHECKOUT_ORIGIN','https://checkout.example.invalid');vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('SONDER_CHECKOUT_PROFILE',checkoutProfile);vi.stubEnv('SONDER_RELEASE_SCOPE','historical-staging');auth.withAuth.mockResolvedValue({user:{id:'server-only-user'},accessToken:'server-only-token'});});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it.each(['production',undefined])('never enables checkout from a profile flag alone: %s',async environment=>{
 vi.stubEnv('VERCEL_ENV',environment);const f=vi.fn();vi.stubGlobal('fetch',f);
 expect(checkoutPreviewAvailable()).toBe(false);expect((await POST(req())).status).toBe(503);expect(auth.withAuth).not.toHaveBeenCalled();expect(f).not.toHaveBeenCalled();
});
it('blocks marketing and SSR1 even on a historical preview',async()=>{
 vi.stubEnv('SONDER_SITE_MODE','marketing-only');expect((await POST(req())).status).toBe(503);
 vi.stubEnv('SONDER_SITE_MODE',undefined);vi.stubEnv('SOLO_RELEASE_PROFILE','SONDER-SOLO-RECOVERY-1');expect((await POST(req())).status).toBe(503);expect(auth.withAuth).not.toHaveBeenCalled();
});
it('relays only canonical offer/idempotency after CSRF and sealed-session validation',async()=>{
 const f=vi.fn().mockResolvedValue(Response.json({...ready,customerId:'do-not-expose',providerSecret:'do-not-expose'},{status:201}));vi.stubGlobal('fetch',f);
 const r=await POST(req());expect(r.status).toBe(201);expect(await r.json()).toEqual({checkoutRequestId:requestId,checkoutUrl:ready.checkoutUrl,expiresAt:ready.expiresAt});expect(r.headers.get('cache-control')).toContain('no-store');
 expect(f).toHaveBeenCalledOnce();expect(f).toHaveBeenCalledWith(new URL('https://api.invalid/v1/customer/checkout'),expect.objectContaining({method:'POST',redirect:'manual',headers:expect.objectContaining({Authorization:'Bearer server-only-token','Sonder-Commercial-Profile':checkoutProfile}),body:JSON.stringify(input)}));
});
it.each([{...input,customerId:'attacker'},{...input,email:'attacker@example.invalid'},{...input,variantId:'123'},{...input,quantity:2}])('denies browser-owned commercial inputs %j',async value=>{
 expect((await POST(req(value))).status).toBe(400);expect(auth.withAuth).not.toHaveBeenCalled();
});
it('denies CSRF and unauthenticated requests before upstream work',async()=>{
 const f=vi.fn();vi.stubGlobal('fetch',f);expect((await POST(req(input,false))).status).toBe(403);expect(auth.withAuth).not.toHaveBeenCalled();
 auth.withAuth.mockResolvedValue({user:null,accessToken:null});expect((await POST(req())).status).toBe(401);expect(f).not.toHaveBeenCalled();
});
it.each([{checkoutUrl:'https://evil.invalid/checkout/custom/test'},{checkoutUrl:'javascript:alert(1)'},{expiresAt:now-1},{profile:'future'},{expiresAt:now+3600}])('fails closed for invalid checkout success %j',async patch=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({...ready,...patch},{status:201})));
 expect(await requestCheckout('token',input)).toEqual({kind:'error',error:'checkoutOutcomeUnknown'});
});
it.each([[403,'accountUnlinked'],[403,'accountDisabled'],[403,'emailNotVerified'],[503,'checkoutOutcomeUnknown'],[429,'rateLimited']] as const)('preserves %s / %s',async(status,error)=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error},{status})));expect(await requestCheckout('token',input)).toEqual({kind:'error',error});
});
it('does not accept success-shaped error data or infer grants from return/cancel query state',()=>{
 expect(parseCheckout({...ready,customerId:'extension'},'https://checkout.example.invalid',now)).toMatchObject({kind:'ready'});
 for(const page of [ReturnPage,CancelledPage]){const html=renderToStaticMarkup(page());expect(html).toContain('href="/account"');expect(html).not.toContain('<form');expect(html).not.toContain('activationId');}
 expect(checkoutReturnPath('//evil.invalid')).toBeUndefined();expect(checkoutReturnPath('/account/checkout/return?paid=true')).toBeUndefined();expect(checkoutReturnPath('/account/checkout/return')).toBe('/account/checkout/return');
});

it('enforces the exact advertised checkout lifetime against an explicit clock',()=>{
 expect(parseCheckout({...ready,expiresAt:now+1800},'https://checkout.example.invalid',now)).toMatchObject({kind:'ready'});
 expect(parseCheckout({...ready,expiresAt:now+1801},'https://checkout.example.invalid',now)).toBeNull();
});
