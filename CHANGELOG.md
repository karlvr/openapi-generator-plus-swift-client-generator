# @openapi-generator-plus/swift-client-generator

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
