---
"@openapi-generator-plus/swift-client-generator": major
---

Encode and switch on a discriminator's raw string value.

A discriminated `oneOf` or hierarchy previously typed its discriminator against
the discriminator property's enum. When each member declares its own inline
discriminator enum there is no single Swift type the switch can use, and the
generated code did not compile.

This changes the generated API: the `unknown` case of these enums carries a
`String` instead of the discriminator's enum type, and the cases compare
against the values as they appear on the wire.
