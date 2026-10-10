---
"@openapi-generator-plus/swift-client-generator": major
---

Give a caller the headers that the API declares on a response.

A response that declares headers now has a struct of its own, nested in the API struct and named
after the operation and the status code, such as `GetUser200`. The struct carries the `body` and a
property for each header, and the result case carries the struct:

```swift
switch try await api.getUser(id: id) {
case let ._200(response):
    print(response.body.name, response.xRateLimit ?? 0)
}
```

A response that declares no headers carries its body alone, as before.

The client reads each header as the type that the API gives it. A list header may have whitespace
around its commas. A required header that is absent, or a value that does not parse, throws
`APIError.invalidResponse` with a `ResponseHeaderError`.
