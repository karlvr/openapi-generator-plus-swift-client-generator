---
"@openapi-generator-plus/swift-client-generator": patch
---

Write a null multipart part: a text part as an empty string, and a JSON part as `null`. A binary part
has no null form, so a null one is still left out.
