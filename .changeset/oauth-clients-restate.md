---
"@openapi-generator-plus/swift-client-generator": patch
---

Restate the inherited `@unchecked Sendable` conformance on the OAuth flow clients. This removes a
compiler warning in Swift 6.4 for each of `OAuthAuthorizationCodeFlowClient`,
`OAuthClientCredentialsFlowClient` and `OAuthPasswordFlowClient`.
