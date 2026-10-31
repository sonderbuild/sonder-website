/** Bound bodies before OpenNext's converter buffers them. No user state retained. */
export const authLimit = 1024;
export const actionLimit = 1048576;
export const bodyDeadlineMs = 5000;
export const cancelDeadlineMs = 50;
async function cancelBody(stream, waitUntil) {
  if (!stream) return;
  const stopped = stream.cancel().catch(() => {});
  waitUntil?.(stopped);
  let timer;
  try { await Promise.race([stopped, new Promise(resolve => { timer = setTimeout(resolve, cancelDeadlineMs); })]); }
  finally { clearTimeout(timer); }
}
function deny(status, error) {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin' } });
}
export async function boundWebsiteRequest(request, expectedOrigin, waitUntil) {
  const invalidOrigin = expectedOrigin && !["GET", "HEAD", "OPTIONS"].includes(request.method) && request.headers.get("origin") !== expectedOrigin;
  const originDenied = () => deny(403, "invalidRequest");
  if (request.method === 'GET' || request.method === 'HEAD' || !request.body) return invalidOrigin ? originDenied() : request;
  let pathname = new URL(request.url).pathname;
  // Apply the same small limit to encoded aliases before an adapter may decode.
  try { pathname = decodeURIComponent(pathname); } catch { /* unknown path keeps the general bound */ }
  const auth = /^\/api\/(?:auth\/magic\/(?:request|verify)|account\/checkout)$/.test(pathname);
  const limit = auth ? authLimit : actionLimit;
  const length = request.headers.get('content-length');
  const invalidLength = length !== null && (!/^\d+$/.test(length) || Number(length) > limit);
  const reader = request.body.getReader(); let complete = false; let timer;
  const deadline = new Promise((_, reject) => { timer = setTimeout(() => reject(Error('body_timeout')), bodyDeadlineMs); });
  try {
    const parts = []; let size = 0;
    for (;;) {
      const next = await Promise.race([reader.read(), deadline]);
      if (next.done) { complete = true; break; }
      size += next.value.byteLength;
      if (size > limit) return deny(auth ? 400 : 413, auth ? 'invalidRequest' : 'requestTooLarge');
      parts.push(next.value);
    }
    if (invalidLength) return deny(auth ? 400 : 413, auth ? 'invalidRequest' : 'requestTooLarge');
    // Finish a bounded upload before returning an origin rejection. This avoids
    // leaving workerd's incoming multipart stream alive after the response.
    if (invalidOrigin) return originDenied();
    const bytes = new Uint8Array(size); let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    const headers = new Headers(request.headers); headers.set('content-length', String(size));
    return new Request(request, { body: bytes, headers });
  } catch {
    return deny(auth ? 400 : 408, auth ? 'invalidRequest' : 'requestTimeout');
  } finally {
    clearTimeout(timer);
    if (!complete) await cancelBody(reader, waitUntil);
    reader.releaseLock();
  }
}
