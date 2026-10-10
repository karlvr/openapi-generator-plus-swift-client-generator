---
"@openapi-generator-plus/swift-client-generator": major
---

Keep discriminator properties, and fix a member's value to its type

This supports the core keeping a discriminator property in the schema that declares it, which
previously failed to compile.

- A member of a discriminator declares the discriminator property as a computed property with its
  own value, for example `public var petType: String { "Cat" }`. It always writes the property when
  it's encoded, including when it's sent outside of its union, and its value can't disagree with
  its type. The property is no longer in the member's initialiser.
- A schema that declares a discriminator property keeps it as a stored property, so a caller can
  send it when the schema is used on its own.
- A member of discriminators that disagree on its value keeps a stored property, as no one value
  fits.
- A protocol declares a discriminator property as read-only.
- A union reads and writes a boolean discriminator as a boolean rather than as a string, and writes
  the discriminator property once.
