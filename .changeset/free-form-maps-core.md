---
"@openapi-generator-plus/swift-client-generator": patch
---

Require the releases of `generator-common` and `java-like-generator-helper` that ask for core 2.33.0.

Core 2.33.0 is the first release that models `additionalProperties: true` and `additionalProperties: {}` as a map of `JSONValue`, rather than a map of strings that cannot hold a nested value.
