---
"@openapi-generator-plus/swift-client-generator": patch
---

Percent encode a query or a form value once, and encode every character that is not unreserved.

A joined value, such as an array in the `form` style or an object, was encoded twice, so `a b`
arrived as `a%20b`. A "+" in a query value was not encoded, so it arrived as a space. A header
value that held an array is no longer percent encoded.
