import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { log } from '../frag/log'
import { logHeader } from '../frag/logHeader'
import { RootContext } from '../types'

/** The OAuth 2.0 Authorization Code Flow client, with PKCE and state, and the authorization request and errors it uses. */
export function oauthAuthorizationCodeFlowClient(root: RootContext): string {
	return ts`
//  
//  ${generatedBy(root)}
//

import Foundation
import CryptoKit
${logHeader('oauth', root)}

/**
 A client for the OAuth 2.0 Authorization Code Flow (RFC 6749 section 4.1), using PKCE (RFC 7636) and \`state\`.

 Authorizing takes three steps:

 1. Make an authorization request with \`startAuthorization(scopes:additionalParameters:)\`, and open its \`url\` in a browser, such as
    an \`ASWebAuthenticationSession\`.
 2. The authorization server redirects the browser to the \`redirectURI\`, with an authorization code.
 3. Hand the URL of that redirect to \`authenticate(redirectURL:)\`, which checks it against the request and exchanges the code for an
    access token.

 The client remembers each request it starts, until it is redeemed or cancelled, so only the redirect URL has to be handed back to it.
 To keep a request somewhere that survives the app being terminated, make it with \`authorizationRequest(scopes:additionalParameters:)\`
 instead, which doesn't remember it, and redeem it with \`authenticate(redirectURL:request:)\`.

 Where AuthenticationServices is available, \`authorize(scopes:additionalParameters:presentationAnchor:prefersEphemeralWebBrowserSession:)\`
 does all three steps.

 Once authorized, the client authorizes requests with the access token, and refreshes it with the refresh token, at the \`refreshURL\` or
 else the \`tokenURL\`.
 */
public final class OAuthAuthorizationCodeFlowClient: AbstractOAuthFlowClient, @unchecked Swift.Sendable {
    
    /// The token endpoint, where an authorization code is exchanged for an access token.
    public let tokenURL: URL
    /// The authorization endpoint, which the user is sent to in a browser.
    public let authorizationURL: URL
    /// The URI that the authorization server redirects to with the authorization code. It must be registered with the authorization server.
    public let redirectURI: URL
    /// Whether authorization requests use PKCE. Leave it on unless the authorization server rejects it.
    public let usesPKCE: Bool
    /// The authorization server's issuer identifier. When it is set, a redirect must carry an \`iss\` parameter with this value (RFC 9207), which protects against mix-up attacks when the app uses more than one authorization server.
    public let issuer: String?

    private let pendingRequests = PendingRequests()
    
    /**
     Create a client for the Authorization Code Flow.
     - Parameters:
       - clientId: The client identifier.
       - clientSecret: The client secret. A public client, such as a mobile app, doesn't have one, and an empty secret isn't sent.
       - token: The token to start with, such as one restored from storage.
       - refreshURL: The URL to refresh the access token at, if it isn't the \`tokenURL\`.
       - revocationURL: The URL to revoke tokens at, if the server supports revocation.
       - tokenURL: The token endpoint.
       - authorizationURL: The authorization endpoint. Any query that it has is kept.
       - redirectURI: The URI that the authorization server redirects to, as registered with it.
       - usesPKCE: Whether authorization requests use PKCE. Defaults to \`true\`.
       - issuer: The authorization server's issuer identifier, to check the \`iss\` parameter of a redirect against.
       - configuration: The configuration for token requests.
     */
    public init(
        clientId: String,
        clientSecret: String = "",
        token: OAuthAccessToken? = nil,
        refreshURL: URL? = nil,
        revocationURL: URL? = nil,
        tokenURL: URL,
        authorizationURL: URL,
        redirectURI: URL,
        usesPKCE: Bool = true,
        issuer: String? = nil,
        configuration: OAuthConfiguration = OAuthConfiguration()
    ) {
        self.tokenURL = tokenURL
        self.authorizationURL = authorizationURL
        self.redirectURI = redirectURI
        self.usesPKCE = usesPKCE
        self.issuer = issuer
        /* An authorization code flow refreshes at the token endpoint unless the API names another */
        super.init(clientId: clientId, clientSecret: clientSecret, token: token, refreshURL: refreshURL ?? tokenURL, revocationURL: revocationURL, configuration: configuration)
    }

    // MARK: - Starting an authorization

    /**
     Make an authorization request, without remembering it. Redeem it with \`authenticate(redirectURL:request:)\`.

     Use this to keep the request yourself, for example to persist it while the user authorizes in another app.
     - Parameters:
       - scopes: The scopes to request, or \`nil\` for the server's default scopes.
       - additionalParameters: Parameters to add to the authorization URL, such as \`prompt\`, \`login_hint\` or \`nonce\`. A parameter replaces a standard parameter of the same name, such as \`scope\`, except for \`response_type\`, \`client_id\`, \`redirect_uri\`, \`state\` and the PKCE parameters, which the client must control to redeem the code.
     - Returns: The request, whose \`url\` is to be opened in a browser.
     */
    public func authorizationRequest(scopes: [String]? = nil, additionalParameters: [String: String] = [:]) -> OAuthAuthorizationRequest {
        let state = Self.randomURLSafeString()
        let codeVerifier = usesPKCE ? Self.randomURLSafeString() : nil

        var parameters: [(String, String)] = [
            ("response_type", "code"),
            ("client_id", clientId),
            ("redirect_uri", redirectURI.absoluteString),
        ]
        if let scopes = scopes, !scopes.isEmpty {
            parameters.append(("scope", scopes.joined(separator: " ")))
        }
        let protectedNames: Set<String> = ["response_type", "client_id", "redirect_uri", "state", "code_challenge", "code_challenge_method"]
        let additional = additionalParameters.filter { !protectedNames.contains($0.key) }
        parameters.removeAll { additional[$0.0] != nil }
        parameters.append(contentsOf: additional.sorted { $0.key < $1.key }.map { ($0.key, $0.value) })
        parameters.append(("state", state))
        if let codeVerifier = codeVerifier {
            parameters.append(("code_challenge", Self.codeChallenge(for: codeVerifier)))
            parameters.append(("code_challenge_method", "S256"))
        }

        var components = URLComponents(url: authorizationURL, resolvingAgainstBaseURL: true) ?? URLComponents()
        /* Encode each name and value ourselves, as URLComponents leaves characters such as "+" and "&" that a server may misread */
        let query = parameters.map { name, value in
            "\\(Self.formEncode(name))=\\(Self.formEncode(value))"
        }.joined(separator: "&")
        if let existing = components.percentEncodedQuery, !existing.isEmpty {
            components.percentEncodedQuery = existing + "&" + query
        } else {
            components.percentEncodedQuery = query
        }

        return OAuthAuthorizationRequest(
            url: components.url ?? authorizationURL,
            state: state,
            codeVerifier: codeVerifier,
            redirectURI: redirectURI,
            scopes: scopes,
            createdAt: Date()
        )
    }

    /**
     Make an authorization request, and remember it so that \`authenticate(redirectURL:)\` can redeem it.

     More than one request can be pending at a time. Each is redeemed by the redirect that carries its \`state\`.
     - Parameters:
       - scopes: The scopes to request, or \`nil\` for the server's default scopes.
       - additionalParameters: Parameters to add to the authorization URL, such as \`prompt\`, \`login_hint\` or \`nonce\`.
     - Returns: The request, whose \`url\` is to be opened in a browser.
     */
    public func startAuthorization(scopes: [String]? = nil, additionalParameters: [String: String] = [:]) async -> OAuthAuthorizationRequest {
        let request = authorizationRequest(scopes: scopes, additionalParameters: additionalParameters)
        await pendingRequests.insert(request)
        return request
    }

    /// Forget a pending authorization request, for example when the user dismisses the browser.
    public func cancelAuthorization(_ request: OAuthAuthorizationRequest) async {
        await pendingRequests.remove(state: request.state)
    }

    /// Forget every pending authorization request.
    public func cancelAllAuthorizations() async {
        await pendingRequests.removeAll()
    }

    /// Whether an authorization request is waiting for its redirect.
    public var hasPendingAuthorization: Bool {
        get async {
            await !pendingRequests.isEmpty
        }
    }

    /**
     Whether a URL is a redirect to the \`redirectURI\`, which is to say one that this client can redeem.

     Use this to decide whether to hand a URL that the app was opened with to \`authenticate(redirectURL:)\`. Its scheme, host, port and path are compared, and its query and fragment are ignored.
     */
    public func isRedirect(_ url: URL) -> Bool {
        guard
            let candidate = URLComponents(url: url, resolvingAgainstBaseURL: true),
            let expected = URLComponents(url: redirectURI, resolvingAgainstBaseURL: true)
        else {
            return false
        }
        func normalizedPath(_ path: String) -> String {
            path.isEmpty ? "/" : path
        }
        func normalizedPort(_ components: URLComponents) -> Int? {
            switch (components.port, components.scheme?.lowercased()) {
            case (nil, "https"?): return 443
            case (nil, "http"?): return 80
            default: return components.port
            }
        }
        return candidate.scheme?.lowercased() == expected.scheme?.lowercased()
            && candidate.host?.lowercased() == expected.host?.lowercased()
            && normalizedPort(candidate) == normalizedPort(expected)
            && normalizedPath(candidate.path) == normalizedPath(expected.path)
    }

    // MARK: - Completing an authorization

    /**
     Complete a pending authorization request, by checking the redirect that the authorization server sent and exchanging its authorization code for an access token.

     The request is the one, started with \`startAuthorization(scopes:additionalParameters:)\`, whose \`state\` the redirect carries. It is forgotten once the redirect is checked, whatever the result, as an authorization code can only be redeemed once.
     - Parameter redirectURL: The URL that the authorization server redirected to, such as the callback URL from an \`ASWebAuthenticationSession\`, or a URL that the app was opened with.
     - Throws: \`OAuthAuthorizationCodeFlowError\` if the redirect isn't one that the client can redeem, or if the authorization server reported an error. \`APIError\` if the token request fails.
     */
    public func authenticate(redirectURL: URL) async throws {
        let response = try parseRedirect(redirectURL)
        guard let state = response.state, let request = await pendingRequests.remove(state: state) else {
            ${log({ level: 'error', msg: 'The redirect doesn\'t carry the state of a pending authorization request' })}
            throw OAuthAuthorizationCodeFlowError.unknownState
        }
        try await redeem(response, of: request)
    }

    /**
     Complete an authorization request, by checking the redirect that the authorization server sent and exchanging its authorization code for an access token.

     If the request is pending, it is forgotten.
     - Parameters:
       - redirectURL: The URL that the authorization server redirected to.
       - request: The request that the redirect answers.
     - Throws: \`OAuthAuthorizationCodeFlowError\` if the redirect isn't one that the client can redeem for the request, or if the authorization server reported an error. \`APIError\` if the token request fails.
     */
    public func authenticate(redirectURL: URL, request: OAuthAuthorizationRequest) async throws {
        let response = try parseRedirect(redirectURL)
        guard response.state == request.state else {
            ${log({ level: 'error', msg: 'The redirect doesn\'t carry the state of the authorization request' })}
            throw OAuthAuthorizationCodeFlowError.unknownState
        }
        await pendingRequests.remove(state: request.state)
        try await redeem(response, of: request)
    }

    /**
     Exchange an authorization code for an access token.

     Prefer \`authenticate(redirectURL:)\`, which checks the redirect before it redeems the code.
     - Parameters:
       - authorizationCode: The authorization code.
       - codeVerifier: The PKCE code verifier of the request that the code answers, if it used PKCE.
       - redirectURI: The redirect URI of the request that the code answers. Defaults to the client's \`redirectURI\`.
     - Throws: \`APIError.authenticationFailed\` if the authorization server refuses the code. The current token, if there is one, is kept.
     */
    public func authenticate(authorizationCode: String, codeVerifier: String?, redirectURI: URL? = nil) async throws {
        var form: [String: String] = [
            "grant_type": "authorization_code",
            "code": authorizationCode,
            "redirect_uri": (redirectURI ?? self.redirectURI).absoluteString,
            "client_id": clientId,
        ]
        if !clientSecret.isEmpty {
            form["client_secret"] = clientSecret
        }
        if let codeVerifier = codeVerifier {
            form["code_verifier"] = codeVerifier
        }
        let request = createOAuthRequest(url: tokenURL, params: form)

        let requestDate = Date()
        let result = try await configuration.transport.handleApiRequest(request, retryConfiguration: configuration.retryConfiguration)
        switch result.response.statusCode {
        case 200:
            var resultData = try JSONDecoder().decode(OAuthAccessToken.self, from: result.data)
            resultData.createdAt = requestDate
            try await tokenManager.setAccessToken(resultData)
        default:
            ${log({ level: 'error', msg: 'The authorization code exchange failed with status code \\(result.response.statusCode)' })}
            throw APIError.authenticationFailed(result.response, data: result.data)
        }
    }

    // MARK: - Redirects

    /// The parameters of a redirect from the authorization server.
    private struct RedirectResponse {
        var state: String?
        var code: String?
        var error: String?
        var errorDescription: String?
        var errorURI: String?
        var issuer: String?
    }

    private func parseRedirect(_ url: URL) throws -> RedirectResponse {
        guard isRedirect(url), let components = URLComponents(url: url, resolvingAgainstBaseURL: true) else {
            throw OAuthAuthorizationCodeFlowError.invalidRedirect(url)
        }

        /* The parameters are in the query, or in the fragment when the request asked for response_mode=fragment */
        let queryItems = Self.formDecode(components.percentEncodedQuery)
        let fragmentItems = Self.formDecode(components.percentEncodedFragment)
        let responseNames: Set<String> = ["code", "state", "error"]
        let items = fragmentItems.contains(where: { responseNames.contains($0.name) }) ? fragmentItems : queryItems

        func value(_ name: String) -> String? {
            items.first(where: { $0.name == name })?.value
        }
        return RedirectResponse(
            state: value("state"),
            code: value("code"),
            error: value("error"),
            errorDescription: value("error_description"),
            errorURI: value("error_uri"),
            issuer: value("iss")
        )
    }

    private func redeem(_ response: RedirectResponse, of request: OAuthAuthorizationRequest) async throws {
        if let issuer = issuer, response.issuer != issuer {
            throw OAuthAuthorizationCodeFlowError.issuerMismatch(expected: issuer, received: response.issuer)
        }
        if let error = response.error {
            ${log({ level: 'error', msg: 'The authorization server returned an error: \\(error)' })}
            throw OAuthAuthorizationCodeFlowError.authorizationFailed(error: error, description: response.errorDescription, uri: response.errorURI)
        }
        guard let code = response.code, !code.isEmpty else {
            throw OAuthAuthorizationCodeFlowError.missingAuthorizationCode
        }
        try await authenticate(authorizationCode: code, codeVerifier: request.codeVerifier, redirectURI: request.redirectURI)
    }

    // MARK: - Helpers

    /// The authorization requests that are waiting for their redirect, by their \`state\`.
    private actor PendingRequests {
        private var requests: [String: OAuthAuthorizationRequest] = [:]

        var isEmpty: Bool {
            requests.isEmpty
        }

        func insert(_ request: OAuthAuthorizationRequest) {
            requests[request.state] = request
        }

        /// Remove and return the request with the given \`state\`. Removing it in the same step that finds it means that two redirects carrying the same code can't both redeem it.
        @discardableResult
        func remove(state: String) -> OAuthAuthorizationRequest? {
            requests.removeValue(forKey: state)
        }

        func removeAll() {
            requests.removeAll()
        }
    }

    /// 32 random bytes, base64url encoded without padding: 43 characters, which suits both \`state\` and a PKCE code verifier (RFC 7636 section 4.1).
    private static func randomURLSafeString() -> String {
        var generator = SystemRandomNumberGenerator()
        let bytes = (0..<32).map { _ in UInt8.random(in: UInt8.min...UInt8.max, using: &generator) }
        return base64URLEncode(Data(bytes))
    }

    /// The S256 PKCE code challenge for a code verifier (RFC 7636 section 4.2).
    static func codeChallenge(for codeVerifier: String) -> String {
        base64URLEncode(Data(SHA256.hash(data: Data(codeVerifier.utf8))))
    }

    private static func base64URLEncode(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private static func formEncode(_ string: String) -> String {
        string.addingPercentEncoding(withAllowedCharacters: .urlUnreserved) ?? string
    }

    /// Decode x-www-form-urlencoded parameters, in which a "+" is a space (RFC 6749 appendix B).
    private static func formDecode(_ percentEncoded: String?) -> [URLQueryItem] {
        guard let percentEncoded = percentEncoded, !percentEncoded.isEmpty else {
            return []
        }
        var components = URLComponents()
        components.percentEncodedQuery = percentEncoded.replacingOccurrences(of: "+", with: "%20")
        return components.queryItems ?? []
    }
}

/**
 An authorization request made by \`OAuthAuthorizationCodeFlowClient\`, with what's needed to redeem the authorization code that it produces.

 It's \`Codable\`, so that it can be kept somewhere that survives the app being terminated while the user authorizes. It holds the PKCE code verifier, so keep it somewhere private.
 */
public struct OAuthAuthorizationRequest: Swift.Codable, Swift.Equatable, Swift.Hashable, Swift.Sendable {
    /// The URL to open in a browser, to ask the user to authorize the client.
    public let url: URL
    /// The value that ties the authorization server's redirect to this request.
    public let state: String
    /// The PKCE code verifier, or \`nil\` if the request doesn't use PKCE.
    public let codeVerifier: String?
    /// The redirect URI that the request names, which the code exchange must name too.
    public let redirectURI: URL
    /// The scopes requested, or \`nil\` for the server's default scopes.
    public let scopes: [String]?
    /// When the request was made.
    public let createdAt: Date

    public init(url: URL, state: String, codeVerifier: String?, redirectURI: URL, scopes: [String]?, createdAt: Date) {
        self.url = url
        self.state = state
        self.codeVerifier = codeVerifier
        self.redirectURI = redirectURI
        self.scopes = scopes
        self.createdAt = createdAt
    }
}

/// The errors in authorizing with \`OAuthAuthorizationCodeFlowClient\`.
public enum OAuthAuthorizationCodeFlowError: Swift.Error, Swift.Equatable, Swift.Sendable {
    /// The URL isn't a redirect to the client's redirect URI.
    case invalidRedirect(URL)
    /// The redirect doesn't carry the \`state\` of a pending authorization request, so it may not be a response to a request that the client made.
    case unknownState
    /// The redirect's \`iss\` isn't the client's issuer.
    case issuerMismatch(expected: String, received: String?)
    /// The authorization server returned an error instead of an authorization code, such as \`access_denied\` when the user declines (RFC 6749 section 4.1.2.1).
    case authorizationFailed(error: String, description: String?, uri: String?)
    /// The redirect carries neither an authorization code nor an error.
    case missingAuthorizationCode
    /// The user cancelled the authorization.
    case cancelled
    /// The redirect URI can't be used to present the authorization, such as an https redirect URI on an OS that can't capture one.
    case unsupportedRedirectURI(URL)
    /// The authorization couldn't be presented.
    case presentationFailed
}

extension OAuthAuthorizationCodeFlowError: Foundation.LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .invalidRedirect(let url):
            return "The authorization response wasn't sent to the expected redirect URI: \\(url)"
        case .unknownState:
            return "The authorization response doesn't match an authorization request that was made."
        case .issuerMismatch(let expected, let received):
            return "The authorization response came from \\(received ?? "an unidentified issuer") rather than \\(expected)."
        case .authorizationFailed(let error, let description, _):
            return description ?? "The authorization failed (\\(error))."
        case .missingAuthorizationCode:
            return "The authorization response doesn't include an authorization code."
        case .cancelled:
            return "The authorization was cancelled."
        case .unsupportedRedirectURI(let url):
            return "The redirect URI isn't supported: \\(url)"
        case .presentationFailed:
            return "The authorization couldn't be presented."
        }
    }
}
`
}
