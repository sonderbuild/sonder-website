import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiKeyRequiredException, WorkOS } from "@workos-inc/node";

const clientId = "client_local_contract_fixture";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function keyless() {
  vi.stubEnv("WORKOS_API_KEY", "");
  vi.stubEnv("WORKOS_CLIENT_ID", clientId);
  const transport = vi.fn(() => { throw new Error("No network is permitted in this contract test"); });
  vi.stubGlobal("fetch", transport);
  return { client: new WorkOS({ clientId }), transport };
}
describe("installed WorkOS local-preview requirements", () => {
  it("constructs a PKCE public-client authorization URL without a server API key or network", async () => {
    const { client, transport } = keyless();
    const pkce = await client.pkce.generate();
    const url = new URL(client.userManagement.getAuthorizationUrl({
      provider: "authkit", clientId, redirectUri: "http://127.0.0.1:3002/login",
      codeChallenge: pkce.codeChallenge, codeChallengeMethod: "S256",
    }));
    expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:3002/login");
    expect(url.searchParams.get("client_id")).toBe(clientId);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(transport).not.toHaveBeenCalled();
  });
  it("requires an API key before the website's Magic Auth request can contact WorkOS", async () => {
    const { client, transport } = keyless();
    await expect(client.userManagement.createMagicAuth({ email: "fixture@example.invalid" })).rejects.toBeInstanceOf(ApiKeyRequiredException);
    expect(transport).not.toHaveBeenCalled();
  });
  it("requires an API key before the website's Magic Auth verification can contact WorkOS", async () => {
    const { client, transport } = keyless();
    await expect(client.userManagement.authenticateWithMagicAuth({ clientId, email: "fixture@example.invalid", code: "000000" })).rejects.toBeInstanceOf(ApiKeyRequiredException);
    expect(transport).not.toHaveBeenCalled();
  });
});
