---
"@openapi-generator-plus/swift-client-generator": minor
---

Give `File` a public initialiser and public properties, so that a caller can send a file in a
multipart request body:

```swift
let file = File(data: data, filename: "photo.jpg")
```
