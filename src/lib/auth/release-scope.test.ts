import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
const mocks=vi.hoisted(()=>({getWorkOS:vi.fn(),saveSession:vi.fn()}));
vi.mock('@workos-inc/authkit-nextjs',()=>mocks);
import { POST } from '@/app/api/auth/social/[provider]/start/route';
import { GET } from '@/app/api/auth/social/callback/route';
import { configuredSocialProviders,createSocialAuthorizationUrl,authenticateSocialCode } from './social-auth';
import ContactPage from '@/app/contact/page';

beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('WORKOS_SOCIAL_PROVIDERS','google,apple');vi.stubEnv('SONDER_RELEASE_SCOPE','historical-staging');});
afterEach(()=>vi.unstubAllEnvs());
describe('selected release social exclusion',()=>{
 it.each(['production','development','unknown',undefined])('ignores a stale allowlist outside historical staging: %s',async environment=>{
  vi.stubEnv('VERCEL_ENV',environment);
  expect(configuredSocialProviders()).toEqual([]);
  const start=await POST(new NextRequest('https://sonder.test/api/auth/social/google/start',{method:'POST',body:'invalid body'}),{params:Promise.resolve({provider:'google'})});
  const callback=await GET(new NextRequest('https://sonder.test/api/auth/social/callback?state=stale&code=stale'));
  expect(start.status).toBe(404);expect(callback.status).toBe(404);
  expect(mocks.getWorkOS).not.toHaveBeenCalled();expect(mocks.saveSession).not.toHaveBeenCalled();
 });
 it('cannot enable social helpers by passing explicit providers or a direct code',async()=>{
  vi.stubEnv('VERCEL_ENV','production');
  const client={getAuthorizationUrl:vi.fn(),authenticateWithCode:vi.fn()};
  expect(createSocialAuthorizationUrl(client,{clientId:'client_test',provider:'google',state:crypto.randomUUID(),redirectUri:'https://sonder.test/api/auth/social/callback'},['google'])).toBeUndefined();
  expect(await authenticateSocialCode(client,'client_test','code')).toEqual({kind:'failed'});
  expect(client.getAuthorizationUrl).not.toHaveBeenCalled();expect(client.authenticateWithCode).not.toHaveBeenCalled();
 });
 it.each(['SONDER-SOLO-RECOVERY-1','unknown'])('SSR1 and unknown profile markers deny even on a historical preview: %s',async profile=>{
  vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('SOLO_RELEASE_PROFILE',profile);
  expect(configuredSocialProviders()).toEqual([]);
  expect((await GET(new NextRequest('https://staging.sonder.test/api/auth/social/callback?code=stale'))).status).toBe(404);
  expect(mocks.getWorkOS).not.toHaveBeenCalled();
 });
 it('keeps the necessary support/rights contact available',()=>{
  vi.stubEnv('VERCEL_ENV','production');
  expect(renderToStaticMarkup(ContactPage())).toContain('mailto:');
 });
});
