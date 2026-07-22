---
"@openapi-generator-plus/swift-client-generator": minor
---

Add an optional `modifyRequest` block to every generated request method. The block receives the built `URLRequest` (with path, query and header parameters applied) as `inout`, and is invoked after those parameters are set but before authentication is added, allowing per-call customisation of the request. It is exposed on all method overloads, including the `…Request` builder.
