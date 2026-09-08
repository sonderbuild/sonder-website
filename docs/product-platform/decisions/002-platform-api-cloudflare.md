# ADR 002: Keep the platform API on Cloudflare Workers

**Status:** accepted

`sonder-api` already safely provides product API routes at `api.sonder.build`.
New product-platform endpoints belong there rather than in Vercel API routes.
Vercel remains responsible for the website and future account presentation.

This preserves working infrastructure, scopes product secrets to one backend,
and avoids a migration with no customer benefit.
