---
"@openapi-generator-plus/swift-client-generator": minor
---

Keep an OAuth session alive across refreshes and relaunches

- The preemptive access token refresh now fires. It was scheduled with a `Timer` on the token
  manager actor, which has no run loop. It is measured from when the token was issued, so a token
  restored from storage is refreshed on time.
- A refresh response that omits the refresh token keeps the current one, as RFC 6749 allows.
- An empty client secret isn't sent when refreshing or revoking.
- `OAuthAccessToken` is `Codable`, encodes when it was issued, carries the OpenID Connect `idToken`,
  and reads an `expires_in` sent as a string.
- The flow clients have `refresh()`, `validAccessToken()` and `signOut()`.
- The `SecurityScheme` factories pass the `token` that they're given when the API doesn't declare a
  refresh URL. They dropped it before.
