import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const settings = JSON.parse(readFileSync(new URL("../../../.dev-launch.json", import.meta.url), "utf8"));
describe("local development launcher policy", () => {
  it("requires real development session configuration and retains the documented login compatibility route", () => {
    expect(settings).toEqual({version:1,shareDevelopmentEnv:true,requiredEnv:["WORKOS_API_KEY","WORKOS_CLIENT_ID","WORKOS_COOKIE_PASSWORD"],authkitLoginPath:"/login",port:3000});
    // The social callback exchanges codes separately; it is not the proxy redirect.
    expect(settings.authkitLoginPath).not.toBe("/api/auth/social/callback");
    expect(settings).not.toHaveProperty("WORKOS_API_KEY");
  });
});
