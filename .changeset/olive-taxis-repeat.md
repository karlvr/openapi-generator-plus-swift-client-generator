---
"@openapi-generator-plus/swift-client-generator": major
---

Rename the generated operation parameters structs from `<Operation>Request` to
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
