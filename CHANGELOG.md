# @openapi-generator-plus/swift-client-generator

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
