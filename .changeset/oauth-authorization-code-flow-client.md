---
"@openapi-generator-plus/swift-client-generator": minor
---

Implement the OAuth 2.0 authorization code flow client

`OAuthAuthorizationCodeFlowClient` was a placeholder. It now makes authorization requests with PKCE and
`state`, checks the redirect that the authorization server sends against the request it answers, and
exchanges the authorization code for an access token. It refreshes at the token endpoint unless it is
given a `refreshURL`.

- `startAuthorization(scopes:additionalParameters:)` makes a request and remembers it, and
  `authenticate(redirectURL:)` redeems the redirect that carries its `state`. More than one request
  can be pending.
- `authorizationRequest(scopes:additionalParameters:)` makes a request without remembering it, as a
  `Codable` `OAuthAuthorizationRequest` that a caller can persist, and
  `authenticate(redirectURL:request:)` redeems it.
- `authenticate(authorizationCode:codeVerifier:redirectURI:)` exchanges a code directly.
- `isRedirect(_:)` tells whether a URL that the app was opened with is the client's redirect.
- `issuer` checks the redirect's `iss` parameter (RFC 9207).
- Where AuthenticationServices is available, `authorize(scopes:additionalParameters:presentationAnchor:prefersEphemeralWebBrowserSession:)`
  does the whole flow in an `ASWebAuthenticationSession`.

The initialiser now requires a `redirectURI`, and the client secret defaults to empty for a public
client. The `SecurityScheme` factory for an authorization code flow takes a `redirectURI` too.
