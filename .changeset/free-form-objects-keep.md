---
"@openapi-generator-plus/swift-client-generator": minor
---

Keep the members of an object schema that describes no properties.

An object schema without properties permits any properties, but its struct had no stored properties, so decoding it discarded every member of the object. The struct now has an `additionalProperties` dictionary of `JSONValue` that holds them, and encodes them again.
