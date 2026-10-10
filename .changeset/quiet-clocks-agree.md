---
"@openapi-generator-plus/swift-client-generator": patch
---

Write a UTC date-time with "Z", as RFC 3339 and the server do, rather than "+00:00".

A date-time that the client read as "Z" now goes back to the server as "Z". A "+00:00" in a query
or a form body also arrived as " 00:00", because the "+" stood for a space.
