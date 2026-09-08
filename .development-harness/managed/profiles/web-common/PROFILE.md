# Web common profile

This optional profile extends the portable core for web repositories. It does
not choose a framework, runtime, hosting provider, package manager, or product
architecture for a project.

- Respect documented client, server, shared-library, and deployment boundaries.
- Treat authentication, authorization, secrets, user data, external APIs, and
  data migrations as explicit integration boundaries with failure handling.
- Preserve accessibility, responsive behavior, and progressive enhancement in
  affected user journeys; validate them at the layer the project supports.
- Check user-visible state flows end to end, including loading, empty, error,
  retry, and permission-denied states where applicable.
- Keep browser and server runtime assumptions, build tooling, environment
  variables, and deployment configuration explicit and project-owned.
- Use focused tests and runtime checks appropriate to the changed path; do not
  treat a component-only test as proof that a browser-to-service flow works.
