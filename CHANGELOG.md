# @openapi-generator-plus/swift-client-generator

## 4.0.0

### Major Changes

- 9de6eaa: Keep discriminator properties, and fix a member's value to its type

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

- 74c1225: Give a caller the headers that the API declares on a response.

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

- aa25e11: Refuse a response body that doesn't declare the media type that the operation expects.

  A response that has no `Content-Type`, or another media type, now throws `APIError.invalidResponse`
  with an `UnexpectedContentTypeError`, rather than a body that the client parsed by guessing. A
  server that leaves out the header must now send it.

### Minor Changes

- 4b76e58: Keep the members of an object schema that describes no properties.

  An object schema without properties permits any properties, but its struct had no stored properties, so decoding it discarded every member of the object. The struct now has an `additionalProperties` dictionary of `JSONValue` that holds them, and encodes them again.

- 33d3d55: Give `File` a public initialiser and public properties, so that a caller can send a file in a
  multipart request body:

  ```swift
  let file = File(data: data, filename: "photo.jpg")
  ```

- af6c756: Send requests through a replaceable `APITransport`.

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

### Patch Changes

- 40073ff: Percent encode a "/" in a path parameter, so that the value stays inside its path segment.
- c7243b7: Send an `Accept` header with the media types that the client parses from the operation's
  responses, rather than the `*/*` that `URLSession` sends.
- 1ac13b3: Write a null array or object parameter as an empty value, as a null scalar already is, so that a
  server can tell it apart from an absent one. An object in the exploded `form` style or the
  `deepObject` style names each of its properties, so a null one is still left out.
- 99b790a: Require the releases of `generator-common` and `java-like-generator-helper` that ask for core 2.33.0.

  Core 2.33.0 is the first release that models `additionalProperties: true` and `additionalProperties: {}` as a map of `JSONValue`, rather than a map of strings that cannot hold a nested value.

- c8ea0ca: Write a null multipart part: a text part as an empty string, and a JSON part as `null`. A binary part
  has no null form, so a null one is still left out.
- 10d90ef: Read a null property in a response as `.null`, rather than as an absent property.

  A nullable property is a `Nullable<T>?`, so `nil` means absent and `.null` means null. The client
  decoded both as `nil`. Code that reads the property's `value` sees no change.

- c12531c: Restate the inherited `@unchecked Sendable` conformance on the OAuth flow clients. This removes a
  compiler warning in Swift 6.4 for each of `OAuthAuthorizationCodeFlowClient`,
  `OAuthClientCredentialsFlowClient` and `OAuthPasswordFlowClient`.
- 26feb1b: Write a UTC date-time with "Z", as RFC 3339 and the server do, rather than "+00:00".

  A date-time that the client read as "Z" now goes back to the server as "Z". A "+00:00" in a query
  or a form body also arrived as " 00:00", because the "+" stood for a space.

- 2fb51ab: Write an array in the `pipeDelimited` or `spaceDelimited` style that explodes as one pair for each
  element, as OpenAPI 3.1 defines it, rather than joining it.
- af08cfc: Percent encode a query or a form value once, and encode every character that is not unreserved.

  A joined value, such as an array in the `form` style or an object, was encoded twice, so `a b`
  arrived as `a%20b`. A "+" in a query value was not encoded, so it arrived as a space. A header
  value that held an array is no longer percent encoded.

## 3.0.1

### Patch Changes

- be8f602: Fix seconds zero padding in date time serialisation.
- a336a51: Encode requests with any +json mime-type as JSON.

## 3.0.0

### Major Changes

- 1f83ace: Generate a request builder per operation group, so callers can make custom requests.

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

- 0afbe0d: Rename the generated operation parameters structs from `<Operation>Request` to
  `<Operation>Params`, and remove the parameters protocols.

  An operation with more than one parameter generates a parameters struct nested in its
  API struct. That struct was named `<Operation>Request`, which read as if it were the
  operation's request — it isn't, it's the operation's parameters — and it's now named
  `<Operation>Params`:

  ```swift
  let result = try await api.getPerson(PeopleApi.GetPersonParams(id: "42", fields: ["name"]))
  ```

  Breaking changes:

  - `<Operation>Request` parameters structs are renamed to `<Operation>Params`. Note that
    this doesn't affect request _body_ schemas, which keep whatever name the API
    specification gives them.

  - The `<Group><Operation>Requestable` protocols are removed, and the methods that took
    one now take the parameters struct itself. The protocols existed so that a caller
    could pass their own type, but a caller that wants their own type can make the
    parameters struct from it at the call site.

  - The `parametersProtocol` template function is removed, and the `parametersStruct` and
    `operation` template functions no longer take the operation group.

## 2.0.0

### Major Changes

- cc93878: Encode and switch on a discriminator's raw string value.

  A discriminated `oneOf` or hierarchy previously typed its discriminator against
  the discriminator property's enum. When each member declares its own inline
  discriminator enum there is no single Swift type the switch can use, and the
  generated code did not compile.

  This changes the generated API: the `unknown` case of these enums carries a
  `String` instead of the discriminator's enum type, and the cases compare
  against the values as they appear on the wire.

- b05f39a: Replace the Handlebars templates with TypeScript templates.

  Templates are now TypeScript code built on the
  `@openapi-generator-plus/template-utils` package (the `ts` tagged template with
  its SKIP/when/maybe/each/join helpers), giving template development type-safety
  against the codegen document model, ordinary code navigation and refactoring,
  and testability. Generated output is byte-identical to the previous Handlebars
  output (trailing whitespace on a line is no longer emitted), verified across the
  full test-spec corpus during the migration.

  Breaking changes:

  - The `customTemplates` config option is removed. Templates are TypeScript
    code; a child generator customizes the output through the typed template
    functions exported from this package. Setting `customTemplates` now logs a
    warning and has no effect.
  - The Handlebars-based extension hooks are removed from `SwiftGeneratorContext`:
    `loadAdditionalTemplates`, `additionalWatchPaths` and
    `additionalExportTemplates`. A child generator emits extra files via the new
    `exportFiles` hook instead.
  - The `handlebars` and `@openapi-generator-plus/handlebars-templates`
    dependencies are dropped.

  Fixes:

  - A top-level wrapper schema now generates a source file. Previously the
    generator asked for a `wrapper` template that didn't exist and failed with
    "Unknown template: wrapper"; only the nested form of the template was
    present.
  - A wrapper's optional property now defaults to its initial value's literal
    rather than to the stringified `CodegenValue` object.

### Minor Changes

- fa2de9b: Generate schemas typed `null` as a new `JSONNull` type.

  The JSON Schema null type, which OpenAPI 3.1 allows, previously failed with
  "Unsupported schema type: NULL".

  `JSONNull` has exactly one value, matching the schema: the only value that can
  be constructed encodes as `null`, and decoding fails if the value isn't `null`.
  `JSONValue` would have compiled, but it accepts any JSON value, so it would
  neither describe the contract to the caller nor reject a response that breaks
  it.

### Patch Changes

- 7e218d0: Declare a property with the optional type when the core makes it optional after
  deriving its native type.

  An `anyOf` absorbed under the object strategy makes the properties it absorbs
  optional. In Swift optionality is part of the type, so the absorbing object
  declared a non-optional property that it then initialised, decoded and encoded
  as if it were optional, which does not compile.

  The core now derives a property's native type from the usage it ends up with,
  so this is fixed by using `@openapi-generator-plus/core` 2.31.2 or later, which
  this package's test suite now uses.

## 1.8.0

### Minor Changes

- 7d7a547: Adds an on APIError closure in configuration

## 1.7.0

### Minor Changes

- 417e50c: Prepare for Swift 6 by ensuring immutability on OAuthPasswordFlowClient and Swift 6 build on testing.
- aa9f6b3: Added Sendable conformance.

  This means that Api calling classes have changed to structs.

- 5849ad2: use JSONValue for any type

## 1.6.0

### Minor Changes

- 5d8bc35: Added configurations for OAuth flows

### Patch Changes

- 5d8bc35: Increased the version number of supported operating systems
- f7152b9: Addresses an issue with decoding timezones that have offsets
- 5d8bc35: Use a logging flag for controlling logging at runtime

## 1.5.1

### Patch Changes

- 4600a68: Tidy whitespace around logging fragments

## 1.5.0

### Minor Changes

- 93cd9d7: Update core

### Patch Changes

- bc71e14: Support an API type named Result or Decimal or String being present
- 34ce270: Added logging to the APIs
- 02a22a5: Fix support for URL parameters

## 1.4.0

### Minor changes

- 30c8d18: Added configuration for enabling logging

### Patch Changes

- fc1a678: Added token to constructor of OAuth clients

## 1.3.0

### Minor Changes

- 61d3d51: Added retry handling for 429 responses
- 48c3965: Update core and other dependencies

### Patch Changes

- 04dd670: Refined refresh token handling of error responses to distinguish between failed authentication and simply an unexpected response
- b454068: Support for negative years in LocalDate and OffsetDateTime

## 1.2.1

### Patch Changes

- 83ab687: fix deprecation mark in Xcode

## 1.2.0

### Minor Changes

- b051e86: Update core
- b403bee: Add support for File type as part of multipart/form-data

### Patch Changes

- db66719: Treat any 4XX response on a token refresh as an invalid token
- 5c46d74: Restrict allowed characters in form encoding to alphanumerics

## 1.1.0

### Minor Changes

- 0622c5d: Discriminator values are now serialized by the enum container

  This is because a single schema may be part of multiple oneOf hierarchies.

## 1.0.3

### Patch Changes

- a417df7: Check for 401 response before checking any other response code. Fixes issue with default case responses.
- bb01ea0: Ensure that default case is always last no matter what order the responses are in the specification

## 1.0.2

### Patch Changes

- 4137811: Clear token on 401 refresh response
- f54aeba: Oauth Credentials Flow: prevent multiple simultaneous attempts to reauthenticate
- 2fc926e: Add support for catch-all response codes
- 6ccdf72: Ensure the refresh task is reset when errors are thrown

## 1.0.1

### Patch Changes

- 2cba862: Fixes request authorization to include a reauthentication attempt if authorize fails

## 1.0.0

### Major Changes

- d922509: Add authorisation support with clients for OAuth flows, basic auth and API key auth
- b1ba51f: Add SecurityScheme enum

## 0.3.3

### Patch Changes

- 4f2ce09: Add annotations to deprecated operations and properties
- eb05a27: Update core and other deps

## 0.3.2

### Patch Changes

- 9420814: Fix decoding of compositions

## 0.3.1

### Patch Changes

- 11b48e6: Support allOf schema where required differs between parent and child
- f4fc1fd: Update to latest core types

## 0.3.0

### Minor Changes

- e2a3c91: Improve Nullable
- 64ec613: Support url string formats

### Patch Changes

- 318747a: Actually use the responseQueue to report results
- cbd95ba: Use configuration.responseQueue and make responseQueue parameter on API operations optional
- d66fca5: Use responseQueue for errors as well
- c77241a: Fix oneOf schemas that contain anonymous schemas
- ac58a0a: Standardise indentation to spaces in templates
- edb99df: Expose literal values of enums
- a573d78: Expose dateComponents and add Date() accessor on date/time types
- 2857915: Fix OffsetDateTime handling of zulu time
- 40c6289: Add Comparable to date/time types
- b10006e: Upgrade dependencies
- 8c303b6: Remove trailing whitespace from templates

## 0.2.0

### Minor Changes

- 5e5f96e: Add a request parameter struct when there are multiple request parameters
- 7739437: Fix operation paths to include group path
- b6a3838: Upgrade to latest openapi-generator-plus

### Patch Changes

- 8d3a0d7: Make public the constructors for Configuration
- 8f505c5: Don't use default value for parameters

  We should send nothing so the server applies the default itself.

- 34d91c4: Make all attributes of the configuration public and give default values
- b04ef0b: Fix incompatible protocol when property types differ incompatibly in an allOf
- df5c28a: Fix double-inclusion of discriminator properties in CodingKeys
- 563b375: Add missing handlebars dependency
- 388811e: Optional attributes now only decode if present
- 5c18407: Expand timezone regex to allow valid variants

## 0.1.3

### Patch Changes

- c8f9458: Removed named capture groups for iOS 9 compatibility

## 0.1.2

### Patch Changes

- 80893ca: Don't transform the parent type either
- 396bca7: Fix object type literals
- b1a45fd: Fix default values on operation parameters
- c155386: Fix enum literals where the enum property isn't required

## 0.1.1

### Patch Changes

- a99ec14: Update to core 0.41.2

## 0.1.0

### Minor Changes

- 4ee0eb5: Upgrade to core v0.40.0
- 65c37d8: Upgrade to core 0.41.0

### Patch Changes

- dfc06ba: Fix serialization of string request bodies
- 955f550: Fixes for core 0.40.0
- 205203b: Fix serialization of arrays in query strings
