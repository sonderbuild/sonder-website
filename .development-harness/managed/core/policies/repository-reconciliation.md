# Repository reconciliation

Use this policy before substantial, uncertain, cross-boundary, or autonomous
work. Treat a task's requested outcome as authoritative, but treat technical
details from prompts, chats, and old plans as hypotheses until repository
evidence confirms them.

## Establish current reality

Inspect the current working-tree state; applicable repository instructions;
product and architecture documents; roadmap; relevant decisions and active
execution plans; affected source, tests, configuration, and production call
sites. Inspect analogous implementations before introducing new concepts.

## Reconcile contradictions

Prefer current product invariants and observable repository behavior over stale
technical assumptions. Update stale implementation documentation when the
repository clearly establishes the correct reality. Do not silently choose a
side when authoritative product requirements genuinely conflict.

## Record the working understanding

For work needing an execution plan, capture the goal, current evidence,
invariants, contradictions, affected integration path, chosen approach, and
validation. For bounded work, retain this understanding in the implementation
notes and final report.
