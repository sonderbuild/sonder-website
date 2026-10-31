import {afterEach,expect,it,vi} from 'vitest';
import {browserJSON,browserRequestTimeoutMs,browserResponseLimit} from './browser-json';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('bounds header and stalled-body time without retrying the mutation',async()=>{
 vi.useFakeTimers();const fetcher=vi.fn().mockResolvedValue(new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));}})));
 vi.stubGlobal('fetch',fetcher);const result=browserJSON('/api/account/checkout',{method:'POST',body:'{}'});const rejected=expect(result).rejects.toThrow('browser_request_timeout');
 await vi.advanceTimersByTimeAsync(browserRequestTimeoutMs+1);await rejected;
 expect(fetcher).toHaveBeenCalledOnce();expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
});
it.each(['declared','chunked','utf8'])('rejects unsafe %s response data',async kind=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(kind==='utf8'?new Response(new Uint8Array([255])):new Response('x'.repeat(browserResponseLimit+1),kind==='declared'?{headers:{'Content-Length':String(browserResponseLimit+1)}}:{})));
 await expect(browserJSON('/api/auth/csrf')).rejects.toThrow();
});
it('uses no-store, same-origin credentials and redirect denial',async()=>{
 const f=vi.fn().mockResolvedValue(Response.json({ok:true}));vi.stubGlobal('fetch',f);
 expect(await browserJSON('/api/auth/csrf')).toEqual({ok:true,status:200,body:{ok:true}});
 expect(f).toHaveBeenCalledWith('/api/auth/csrf',expect.objectContaining({credentials:'same-origin',cache:'no-store',redirect:'error'}));
 await expect(browserJSON('//evil.invalid')).rejects.toThrow('invalid_browser_path');expect(f).toHaveBeenCalledOnce();
});
