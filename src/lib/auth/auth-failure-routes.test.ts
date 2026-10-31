import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const auth=vi.hoisted(()=>({getWorkOS:vi.fn(),saveSession:vi.fn()}));
vi.mock('@workos-inc/authkit-nextjs',()=>auth);
import {POST as requestCode} from '@/app/api/auth/magic/request/route';
import {POST as verifyCode} from '@/app/api/auth/magic/verify/route';
const request=(path:string,body:unknown)=>new NextRequest('https://website.invalid'+path,{method:'POST',headers:{Origin:'https://website.invalid','Content-Type':'application/json','X-Sonder-Csrf':'synthetic-csrf',Cookie:'sonder-csrf=synthetic-csrf'},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('SONDER_WEBSITE_ORIGIN','https://website.invalid');vi.stubEnv('WORKOS_CLIENT_ID','client_synthetic');});
afterEach(()=>vi.unstubAllEnvs());
it.each(['request','verify'])('returns a safe unavailable state when SDK construction fails: %s',async step=>{
 auth.getWorkOS.mockImplementation(()=>{throw Error('secret configuration detail');});
 const r=await (step==='request'?requestCode:verifyCode)(request('/api/auth/magic/'+step,{email:'qa@example.invalid',code:'123456'}));
 expect(r.status).toBe(503);expect(await r.json()).toEqual({error:'temporarilyUnavailable'});
 expect(r.headers.get('cache-control')).toContain('no-store');expect(r.headers.get('set-cookie')).not.toContain('wos-session');expect(auth.saveSession).not.toHaveBeenCalled();
});
it('preserves provider email-unverified rather than saying the code was rejected',async()=>{
 auth.getWorkOS.mockReturnValue({userManagement:{authenticateWithMagicAuth:vi.fn().mockResolvedValue({accessToken:'fixture-access',refreshToken:'fixture-refresh',user:{id:'user_fixture',email:'qa@example.invalid',emailVerified:false}})}});
 const r=await verifyCode(request('/api/auth/magic/verify',{email:'qa@example.invalid',code:'123456'}));
 expect(r.status).toBe(403);expect(await r.json()).toEqual({error:'emailNotVerified'});expect(auth.saveSession).not.toHaveBeenCalled();
});
it('does not seal malformed authenticated provider data',async()=>{
 auth.getWorkOS.mockReturnValue({userManagement:{authenticateWithMagicAuth:vi.fn().mockResolvedValue({user:{id:'user_fixture',email:'qa@example.invalid',emailVerified:true}})}});
 const r=await verifyCode(request('/api/auth/magic/verify',{email:'qa@example.invalid',code:'123456'}));
 expect(r.status).toBe(503);expect(auth.saveSession).not.toHaveBeenCalled();
});
