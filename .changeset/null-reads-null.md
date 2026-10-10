---
"@openapi-generator-plus/swift-client-generator": patch
---

Read a null property in a response as `.null`, rather than as an absent property.

A nullable property is a `Nullable<T>?`, so `nil` means absent and `.null` means null. The client
decoded both as `nil`. Code that reads the property's `value` sees no change.
