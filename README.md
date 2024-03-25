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
