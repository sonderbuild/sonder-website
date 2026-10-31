// Candidate only: no deployment configuration or provider resources are selected.
import { parseServerOrigin } from '../src/lib/server-origin.ts';
import application from '../.open-next/worker.js';
import { boundWebsiteRequest } from './request-boundary.mjs';
const worker = {
  async fetch(request, env, context) {
    const origin = parseServerOrigin(env.SONDER_WEBSITE_ORIGIN);
    if (!origin || origin.protocol !== 'https:') return Response.json({ error: 'temporarilyUnavailable' }, { status: 503, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin' } });
    const admitted = await boundWebsiteRequest(request, origin.origin, pending => context.waitUntil(pending));
    return admitted instanceof Response ? admitted : application.fetch(admitted, env, context);
  },
};

export default worker;
