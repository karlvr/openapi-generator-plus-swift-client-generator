---
"@openapi-generator-plus/swift-client-generator": patch
---

Declare a property with the optional type when the core makes it optional after
deriving its native type.

An `anyOf` absorbed under the object strategy makes the properties it absorbs
optional. In Swift optionality is part of the type, so the absorbing object
declared a non-optional property that it then initialised, decoded and encoded
as if it were optional, which does not compile.

The core now derives a property's native type from the usage it ends up with,
so this is fixed by using `@openapi-generator-plus/core` 2.31.2 or later, which
this package's test suite now uses.
