---
"@openapi-generator-plus/swift-client-generator": minor
---

Generate schemas typed `null` as a new `JSONNull` type.

The JSON Schema null type, which OpenAPI 3.1 allows, previously failed with
"Unsupported schema type: NULL".

`JSONNull` has exactly one value, matching the schema: the only value that can
be constructed encodes as `null`, and decoding fails if the value isn't `null`.
`JSONValue` would have compiled, but it accepts any JSON value, so it would
neither describe the contract to the caller nor reject a response that breaks
it.
