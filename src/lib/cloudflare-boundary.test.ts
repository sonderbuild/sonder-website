import { afterEach, expect, it, vi } from 'vitest';
import { boundWebsiteRequest, authLimit, actionLimit, bodyDeadlineMs, cancelDeadlineMs } from '../../cloudflare/request-boundary.mjs';
afterEach(() => vi.useRealTimers());
const request = (path: string, body: BodyInit, headers: HeadersInit = {}) => new Request('https://website.invalid'+path, { method: 'POST', body, headers, duplex: 'half' } as RequestInit);
it('leaves bodyless reads and their headers untouched', async () => { const r=new Request('https://website.invalid/account'); expect(await boundWebsiteRequest(r)).toBe(r); });
it('preserves exact body, cookies, origin and headers for admitted requests', async () => {
  const r=await boundWebsiteRequest(request('/api/auth/magic/request','{"email":"qa@example.invalid"}',{cookie:'sonder-csrf=fixture',origin:'https://website.invalid','content-type':'application/json'}));
  expect(r).toBeInstanceOf(Request); expect(r.headers.get('cookie')).toBe('sonder-csrf=fixture'); expect(r.headers.get('origin')).toBe('https://website.invalid'); expect(await r.text()).toBe('{"email":"qa@example.invalid"}');
});
it.each([['/api/auth/magic/request',authLimit,400],['/api/auth/magic/verify',authLimit,400],['/account',actionLimit,413]])('bounds actual bytes before the adapter: %s', async(path,limit,status)=>{
  const r=await boundWebsiteRequest(request(path as string,'x'.repeat(Number(limit)+1))); expect(r).toBeInstanceOf(Response); expect(r.status).toBe(status); expect(r.headers.get('cache-control')).toContain('no-store');
});
it('rejects declared oversize even when actual bytes are small',async()=>{
  const r=await boundWebsiteRequest(request('/account','{}',{'content-length':String(actionLimit+1)})); expect(r.status).toBe(413);
});
it('bounds a stalled upload without waiting for a broken cancellation callback',async()=>{
  vi.useFakeTimers(); const cancel=vi.fn(()=>new Promise<void>(()=>{}));
  const pending=boundWebsiteRequest(request('/api/auth/magic/request',new ReadableStream({cancel})));
  await vi.advanceTimersByTimeAsync(bodyDeadlineMs+cancelDeadlineMs); const r=await pending; expect(r.status).toBe(400); expect(cancel).toHaveBeenCalledOnce();
});
it('rejects malformed declared length after bounded consumption and normalizes a false small length after bounded read',async()=>{
  expect((await boundWebsiteRequest(request('/account','{}',{'content-length':'bad'}))).status).toBe(413);
  const r=await boundWebsiteRequest(request('/account','{}',{'content-length':'1'})); expect(r.headers.get('content-length')).toBe('2');
});

it('rejects missing or foreign origin after bounded consumption without forwarding', async () => {
  for (const origin of [undefined, 'https://localhost:1234', 'https://attacker.invalid']) {
    const r=request('/account','bounded invalid-origin payload',origin ? {origin} : {});
    expect((await boundWebsiteRequest(r,'https://website.invalid')).status).toBe(403);
  }
});

it('bounds checkout uploads at the actual1024-byte contract before OpenNext buffering',async()=>{
 const r=await boundWebsiteRequest(request('/api/account/checkout','x'.repeat(authLimit+1)));
 expect(r.status).toBe(400);expect(r.headers.get('cache-control')).toContain('no-store');
 const allowed=await boundWebsiteRequest(request('/api/account/checkout','{}'));expect(await allowed.text()).toBe('{}');
});

it.each(['/api/account/%63heckout','/api%2Faccount%2Fcheckout'])('encoded checkout aliases retain the small adapter bound: %s',async(path)=>{
 const r=await boundWebsiteRequest(request(path,'x'.repeat(authLimit+1)));expect(r.status).toBe(400);
});
