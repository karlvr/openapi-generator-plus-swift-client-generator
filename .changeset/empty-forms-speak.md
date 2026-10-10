---
"@openapi-generator-plus/swift-client-generator": patch
---

Write a null array or object parameter as an empty value, as a null scalar already is, so that a
server can tell it apart from an absent one. An object in the exploded `form` style or the
`deepObject` style names each of its properties, so a null one is still left out.
