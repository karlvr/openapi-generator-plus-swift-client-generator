---
"@openapi-generator-plus/swift-client-generator": minor
---

Add `toQueryMap()` / `withQuery(_:)` query-parameter map helpers to the per-operation parameters struct.

When an operation has query parameters, its generated parameters struct now also exposes:

- `toQueryMap() -> [String: [String]]` — the query parameters serialized by their API names, using the same serialization as the request URL (arrays produce one entry per element; absent optionals are omitted).
- `withQuery(_ query: [String: [String]]) -> Self` — a copy with query parameters overridden from the map, keeping the current value for keys absent from the map.
- a throwing `init(…non-query args…, query: [String: [String]])` that builds the struct from the non-query arguments plus a query map, throwing `APIError.missingRequiredQueryParameter` when a required query parameter is absent from (or unparseable in) the map.

Only query parameters whose values are reconstructable from a string (primitives, enums, and dates/times, plus arrays of those) participate in the map; object-typed query parameters are passed as explicit `init` arguments and left unchanged by `withQuery`. A new `APIError.missingRequiredQueryParameter(name:)` case is added.
