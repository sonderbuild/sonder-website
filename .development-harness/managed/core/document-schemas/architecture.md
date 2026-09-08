# Architecture document schema

`ARCHITECTURE.md` explains the current production system, not a preferred
future implementation.

## Required sections

- System context
- Components and ownership boundaries
- Data and control flow
- Integration map
- Persistence and migration
- External boundaries and failure behavior
- Runtime lifecycle
- Testing architecture
- Known constraints

The integration map must make the relevant production path inspectable from
source or external input to user-visible or runtime output.
