<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Sonder Website Guidelines

## Brand

- Brand name is always written as `sonder` lowercase.
- sonder is an independent software studio.
- The website should feel like a premium creative technology studio, not a SaaS landing page.

## Design Principles

Prefer:

- strong typography
- generous whitespace
- refined layouts
- subtle motion
- careful details
- restrained colors
- editorial presentation

Avoid:

- generic startup gradients
- excessive cards
- dashboard-style layouts
- template-like marketing sections
- unnecessary visual effects

The design inspiration is closer to Apple product pages and boutique design studios.

## Architecture

Use:

- Next.js App Router
- TypeScript
- Tailwind CSS
- reusable components
- data-driven product definitions

Prefer:

- small focused components
- clear folder structure
- maintainable code

Avoid:

- unnecessary dependencies
- premature abstractions
- backend features before they are needed

## Products

Current products:

- Pulse — macOS system monitoring and insights
- Frame — macOS productivity/document workflow
- Crate — macOS music metadata intelligence
- Max for Live devices and creative music tools

## Development Rules

Before changes:

- inspect existing architecture
- understand current dependencies
- preserve existing conventions

After changes:

Run:

```bash
pnpm lint
pnpm build
```

Do not commit unless explicitly requested and validation passes.
```

Then save it:

```zsh
cd ~/Projekte/Web/sonder-website

git add AGENTS.md
git commit -m "Add Sonder website development guidelines"
git push origin main
```
