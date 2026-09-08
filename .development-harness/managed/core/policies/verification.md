# Verification

Choose the least expensive check that can meaningfully falsify the current
implementation hypothesis. Use source and configuration inspection first, then
focused tests or builds, and broaden to integration or runtime validation when
the affected path warrants it.

Batch coherent edits before expensive builds. Do not rerun unchanged passing
checks without a reason, but do not stop verification because an arbitrary
number of compiler or test invocations has been reached. Diagnose repeated
identical failures before retrying.

Record the commands and decisive outcomes actually run. Distinguish static,
automated, and runtime evidence, and state any necessary manual validation.
