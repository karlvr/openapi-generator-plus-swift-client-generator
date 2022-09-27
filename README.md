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
