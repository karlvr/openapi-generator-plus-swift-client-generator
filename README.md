# Swift Client Generator

## Development

To use this library in development we use of the `link` command.

Get started by ensuring that your target project is using the same node version so that the global link will be discoverable. We use a `.nvmrc` file in this project to set the version.

First check that this project builds

```
pnpm install
pnpm run build
```

Then to register this directory with the global registry

```
pnpm run link
```

Then in your target project run

```
pnpm link --global @openapi-generator-plus/swift-client-generator
```

## Design principles

* Create structs to represent request parameters where there are more than one, as the order of parameters is irrelevant but may change as the API spec evolves.
* The server will change over time and may add new enum cases or polymorphic subclasses that the client won't know about yet. The client must be able to identify and ignore the new cases, and continue to handle the known cases.
	* Support receiving an _unknown_ enum value.
	* Support receiving unknown polymorphic objects.
* The API specification is sometimes not the whole story, so a caller must be able to make a request the specification doesn't describe without giving up the client's request handling.

## Custom requests

Each operation group generates a `<Group>ApiRequestBuilder` as well as its `<Group>Api`. The API
struct uses the builder to make its requests, but doesn't expose it: prefer the API struct's
strongly-typed methods, and reach for a builder of your own only when you need a request the
specification doesn't describe.

A builder method returns an `APIRequest`, which holds the `URLRequest` that hasn't been sent yet.
Modify it however you need to, then execute it — security, retries, 401 recovery and response
parsing all happen as they do for the generated API methods.

```swift
let builder = PeopleApiRequestBuilder(configuration: configuration)

var request = try builder.getPerson(id: "42")
request.urlRequest.setValue("1", forHTTPHeaderField: "X-Beta")

let result = try await request.execute()            // parsed into GetPersonResult
let response = try await request.executeUnparsed()  // the raw APIResponse
```

There are two builder methods per operation:

* one taking only the operation's **path parameters**, which is the starting point for a request
  you intend to customise, and
* one taking **all of its parameters**, as the operation's parameters struct when it has more than
  one of them.

The two never collide, as the parameters struct is an unlabelled argument. An operation whose only
parameters are its path parameters gets just the one method, as the two would be the same.

`APIRequest` also offers `finalizedURLRequest()`, which returns the `URLRequest` with its security
requirements satisfied and the configuration's `finalizeRequestBlock` applied — the request exactly
as it will be sent.
