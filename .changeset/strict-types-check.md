---
"@openapi-generator-plus/swift-client-generator": major
---

Refuse a response body that doesn't declare the media type that the operation expects.

A response that has no `Content-Type`, or another media type, now throws `APIError.invalidResponse`
with an `UnexpectedContentTypeError`, rather than a body that the client parsed by guessing. A
server that leaves out the header must now send it.
