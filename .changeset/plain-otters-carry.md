---
"@openapi-generator-plus/swift-client-generator": minor
---

Send requests through a replaceable `APITransport`.

`Configuration` and `OAuthConfiguration` have a new `transport` property. It defaults to
`URLSessionAPITransport.default`, which sends requests with a `URLSession` as before. Provide your
own transport to use a `URLSession` of your own, or to answer requests without a network, for
example from fixtures in tests:

```swift
struct FixtureTransport: APITransport {
    func send(_ request: URLRequest) async throws -> (Data, URLResponse) {
        // Return a canned body and an HTTPURLResponse for the request.
    }
}

let configuration = Configuration(transport: FixtureTransport())
```
