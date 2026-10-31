/** Website server-to-server boundary. Callers preserve endpoint-specific decoding. */
export const platformResponseLimit = 262_144;
export const platformRequestTimeoutMs = 5_000;

export async function fetchPlatform(input: URL, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let complete = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error("platform_timeout")); }, platformRequestTimeoutMs);
  });
  try {
    const pending = fetch(input, { ...init, cache: "no-store", redirect: "manual", signal: controller.signal });
    // Even a noncooperative transport must not leave a late body unobserved after
    // the caller has already received timeout/unavailable. Never retry a mutation.
    void pending.then(late => {
      if (controller.signal.aborted && !late.body?.locked) void late.body?.cancel().catch(() => {});
    }, () => {});
    const response = await Promise.race([pending, deadline]);
    if (response.status >= 300 && response.status < 400) {
      void response.body?.cancel().catch(() => {});
      throw new Error("platform_redirect");
    }
    const length = response.headers.get("content-length");
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > platformResponseLimit)) {
      void response.body?.cancel().catch(() => {});
      throw new Error("platform_response_oversize");
    }
    reader = response.body?.getReader();
    if (!reader) return new Response(null, { status: response.status });
    const parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const next = await Promise.race([reader.read(), deadline]);
      if (next.done) { complete = true; break; }
      size += next.value.byteLength;
      if (size > platformResponseLimit) throw new Error("platform_response_oversize");
      parts.push(next.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    return new Response(new TextDecoder("utf-8", { fatal: true }).decode(bytes), { status: response.status, headers: { "Content-Type": "application/json" } });
  } finally {
    clearTimeout(timer);
    controller.abort();
    if (reader) {
      if (!complete) void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
}
