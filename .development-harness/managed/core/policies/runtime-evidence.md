# Runtime evidence

Treat claims about external applications, devices, operating-system behavior,
permissions, networks, filesystems, hardware, and lifecycle interaction as
evidence-sensitive. Do not turn an API name, configuration entry, mocked test,
or static observation into a production support claim.

Record the strongest available evidence using these terms:

- **Assumed:** inferred from an interface, documentation, or configuration but
  not observed in this project.
- **Statically observed:** visible in source, configuration, fixtures, or a
  controlled artifact without the real interaction occurring.
- **Experimentally observed:** reproduced through a scoped probe or manual
  experiment; its coverage and conditions are known.
- **Reliably verified:** exercised through the supported production path with
  appropriate environment, failure behavior, and repeatable evidence.

For integration-sensitive work, define what runtime condition proves the
affected user journey, preserve unavailable and failure states, and keep probes
or diagnostics privacy-safe. Promote an assumption only when the corresponding
evidence exists. If runtime validation remains manual or unavailable, state the
exact gap rather than overstating verification.
