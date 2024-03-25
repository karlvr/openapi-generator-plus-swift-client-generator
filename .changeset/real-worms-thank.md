---
"@openapi-generator-plus/swift-client-generator": minor
---

Discriminator values are now serialized by the enum container

This is because a single schema may be part of multiple oneOf hierarchies.
