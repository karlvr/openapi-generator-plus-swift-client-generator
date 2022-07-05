# @openapi-generator-plus/swift-client-generator

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
