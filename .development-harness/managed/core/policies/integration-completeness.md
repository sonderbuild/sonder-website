# Integration completeness

A local component, unit test, or successful compilation does not by itself
prove a feature is complete. Trace the affected journey from input or external
source through adapters, domain logic, persistence or state, production
consumers, and UI or runtime output.

Inspect the integration points appropriate to the change: dependency injection,
service registration, configuration, build target membership, lifecycle,
permissions, navigation, observation, persistence and migration, feature flags,
failure handling, cleanup, and external fallbacks.

Validate the narrowest end-to-end path that can reveal an unconnected feature.
When runtime validation is impractical, report the remaining manual check and
why it could not be performed. Do not describe mocked or compiled behavior as
runtime evidence.
