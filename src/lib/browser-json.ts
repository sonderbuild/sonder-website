/** Finite same-origin browser requests. Never retry a mutation after uncertainty. */
export const browserRequestTimeoutMs = 15_000;
export const browserResponseLimit = 16_384;
export async function browserJSON(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; body: unknown }> {
  if (!path.startsWith("/") || path.startsWith("//")) throw Error("invalid_browser_path");
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let complete = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(Error("browser_request_timeout")); }, browserRequestTimeoutMs);
  });
  try {
    const pending = fetch(path, { ...init, credentials: "same-origin", cache: "no-store", redirect: "error", signal: controller.signal });
    void pending.then(late => { if (controller.signal.aborted && !late.body?.locked) void late.body?.cancel().catch(() => {}); }, () => {});
    const response = await Promise.race([pending, deadline]);
    const length = response.headers.get("content-length");
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > browserResponseLimit)) { void response.body?.cancel().catch(() => {}); throw Error("browser_response_oversize"); }
    reader = response.body?.getReader();
    if (!reader) throw Error("browser_response_missing");
    const bytes = new Uint8Array(browserResponseLimit); let size = 0;
    for (;;) {
      const next = await Promise.race([reader.read(), deadline]);
      if (next.done) { complete = true; break; }
      if (next.value.byteLength > browserResponseLimit - size) throw Error("browser_response_oversize");
      bytes.set(next.value, size); size += next.value.byteLength;
    }
    return { ok: response.ok, status: response.status, body: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, size))) as unknown };
  } finally {
    clearTimeout(timer); controller.abort();
    if (reader) { if (!complete) void reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}
