import { expect, it } from "vitest";
import configuration from "../../next.config";

it("emits baseline framing, MIME and referrer protections without introducing a cache policy", async () => {
  const rules = await configuration.headers?.();
  expect(rules).toEqual([{ source: "/:path*", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin" },
    { key: "X-Frame-Options", value: "DENY" },
  ] }]);
});
