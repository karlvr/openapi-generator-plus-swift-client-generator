---
"@openapi-generator-plus/swift-client-generator": patch
---

Request a new token when an `OAuthClientCredentialsFlowClient` access token expires without a
refresh token. Previously every request failed with `APIError.notAuthenticated` once the token
expired, and no new token was requested until the client was recreated.
