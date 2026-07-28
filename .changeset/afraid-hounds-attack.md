---
"@openapi-generator-plus/swift-client-generator": major
---

Generate a request builder per operation group, so callers can make custom requests.

Each operation group now also generates a `<Group>ApiRequestBuilder` alongside its
`<Group>Api`. A builder method returns an `APIRequest<Result>` holding a mutable
`urlRequest` that has not yet been sent, so you can modify it and then send it
through the client's usual security, retry, 401 recovery and response handling:

```swift
let builder = PeopleApiRequestBuilder(configuration: configuration)

var request = try builder.getPerson(id: "42")
request.urlRequest.setValue("1", forHTTPHeaderField: "X-Beta")

let result = try await request.execute()            // parsed into the operation's result
let response = try await request.executeUnparsed()  // the raw APIResponse
```

The API struct uses a builder to make its requests but keeps it internal, so that
its strongly-typed methods are what's reached for; making a builder yourself is the
deliberate step that gets you a custom request.

There are two builder methods per operation: one taking only the operation's path
parameters, for a request you intend to customise, and one taking all of its
parameters — as the operation's parameters struct when it has more than one.

Security is now applied when a request is _sent_ rather than when it's built, which
is what lets a modified request still be authorized, and lets a 401 be recovered
from by reauthenticating and authorizing the same request again. Each operation's
security requirements are generated as a `SecurityRequirements` value rather than
as code.

Breaking changes:

- The `<operation>Request(...) async throws -> URLRequest` methods are removed from
  the generated API structs. They could not be used to send a request, which is
  what the request builder is for. Replace

  ```swift
  let urlRequest = try await api.getPersonRequest(id: "42")
  ```

  with

  ```swift
  let urlRequest = try await PeopleApiRequestBuilder(configuration: configuration)
      .getPerson(id: "42")
      .finalizedURLRequest()
  ```

  which applies security and the configuration's `finalizeRequestBlock` in the same
  way, returning an identical request.

- The generated API structs no longer have their own `configuration`, `basePath`,
  `cachePolicy` and `timeoutInterval` properties: the request builder owns them, and
  builds the requests. They were internal, so no consumer of a generated package is
  affected.

- `URLSessionResponse` is renamed to `APIResponse` and is now public. The old name
  remains as a deprecated typealias.

- The `api` template function no longer takes the document's servers; the new
  `requestBuilder` template function takes them instead.
