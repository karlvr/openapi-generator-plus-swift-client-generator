import { ts } from '@openapi-generator-plus/template-utils'
import { log } from '../frag/log'
import { logHeader } from '../frag/logHeader'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

/** The OAuth access token manager, which refreshes and applies the access token. */
export function oauthAccessTokenManager(root: RootContext): string {
	const additional = root.additionalTokenFailureStatusCodes.join(', ')
	const additionalTokenFailureStatusCodes = additional ? `, ${additional}` : ''

	return ts`
//  
//  ${generatedBy(root)}
//

import Foundation
${logHeader('oauth', root)}

public typealias AccessTokenHandler = @Sendable (_ accessToken: OAuthAccessToken?) -> ()

/** An OAuth access token manager that manages using and refreshing the access token, including handling concurrent requests and refreshes. */
actor OAuthAccessTokenManager {
    
    /// The current token. Change it with \`setAccessToken(_:)\`, or otherwise call \`restartPreemptiveRefresh()\` after changing it.
    private(set) var accessToken: OAuthAccessToken?
    
    private let clientId: String
    private let clientSecret: String
    private let refreshTokenURL: URL?
    private var refreshTask: Task<(), Error>?
    private var preemptiveRefreshTask: Task<(), Never>?
    private let configuration: OAuthConfiguration
    
    init(clientId: String, clientSecret: String, token: OAuthAccessToken?, refreshTokenURL: URL?, configuration: OAuthConfiguration) {
        self.clientId = clientId
        self.clientSecret = clientSecret
        self.refreshTokenURL = refreshTokenURL
        self.accessToken = token
        self.configuration = configuration

        // Schedule the refresh of a token that we start with, such as one restored from storage. It's done from a task as the scheduling is isolated to the actor and the initialiser is not.
        Task { [weak self] in
            await self?.restartPreemptiveRefresh()
        }
    }

    /// The parameters that identify the client to the token endpoint. A public client, such as a mobile app, has no secret, so an empty secret is not sent.
    private var clientParams: [String: String] {
        var params = ["client_id": clientId]
        if !clientSecret.isEmpty {
            params["client_secret"] = clientSecret
        }
        return params
    }

    /// Schedule a refresh of the access token shortly before it expires, if the configuration asks for one, replacing any refresh already scheduled.
    ///
    /// Call this whenever the token changes.
    ///
    /// This uses a task rather than a \`Timer\`, as an actor doesn't run on a thread with a run loop to fire a timer.
    private func restartPreemptiveRefresh() {
        preemptiveRefreshTask?.cancel()
        preemptiveRefreshTask = nil

        guard
            let leadTime = configuration.preemptiveAccessTokenRefresh,
            let token = accessToken,
            token.refreshToken != nil,
            let expiresIn = token.expiresIn
        else {
            return
        }

        /* Measure from when the token was issued, so that a token restored from storage is refreshed at the right time */
        let refreshAt = (token.createdAt ?? Date()).addingTimeInterval(expiresIn - leadTime)
        let delay = refreshAt.timeIntervalSinceNow
        guard delay > 0 else {
            return
        }

        preemptiveRefreshTask = Task { [weak self] in
            do {
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            } catch {
                return /* Cancelled, as the token has changed */
            }
            guard let self = self else {
                return
            }
            do {
                try await self.refreshToken()
            } catch {
                ${log({ level: 'error', msg: 'An error occurred in the automatic OAuth access token refresh: \\(String(describing: error))', condition: 'self.configuration.loggingEnabled' })}
            }
        }
    }
    
    /// Replace the access token, and tell the configuration's \`accessTokenDidChange\` handler. Pass \`nil\` to discard the token.
    func setAccessToken(_ token: OAuthAccessToken?) async throws {
        accessToken = token
        restartPreemptiveRefresh()
        configuration.accessTokenDidChange?(token)
    }
    
    func refreshToken() async throws {
        ${log({ level: 'debug', msg: 'Refreshing token' })}
        guard let refreshTokenURL = refreshTokenURL else {
            ${log({ level: 'error', msg: 'There is no refreshTokenURL configured' })}
            throw APIError.notAuthenticated
        }
        guard let refreshToken = accessToken?.refreshToken else {
            ${log({ level: 'error', msg: 'There is no refreshToken to use in order to refresh' })}
            throw APIError.notAuthenticated
        }
        
        // Wait for an existing refresh task, if there is one
        if let t = refreshTask {
            ${log({ level: 'debug', msg: 'Awaiting existing refresh task' })}
            let _ = try await t.value
            ${log({ level: 'debug', msg: 'Awaited refresh task complete' })}
            return
        }
        
        // Clear out the preemptive refresh if scheduled. The refresh itself runs in its own task, so it isn't cancelled if it was the preemptive refresh that called us.
        preemptiveRefreshTask?.cancel()
        preemptiveRefreshTask = nil
        
        /* The token that this refresh replaces. If the token is replaced, or discarded, while the refresh is in flight, the refresh's result is dropped rather than bringing back a session that has ended. */
        let refreshingToken = accessToken

        let t = Task {
            // Do the refresh
            ${log({ level: 'debug', msg: 'Performing refresh request' })}
            let request = createRefreshRequest(refreshToken, url: refreshTokenURL)
            let requestDate = Date()
            let result = try await configuration.transport.handleApiRequest(request, retryConfiguration: configuration.retryConfiguration)
            switch result.response.statusCode {
            case 200:
                ${log({ level: 'debug', msg: 'Refresh request succeeded' })}
                var resultData = try JSONDecoder().decode(OAuthAccessToken.self, from: result.data)
                resultData.createdAt = requestDate
                /* A server may leave the refresh token out of the response, meaning that the current one is still the one to use (RFC 6749 section 6) */
                if resultData.refreshToken == nil {
                    resultData.refreshToken = refreshToken
                }
                if resultData.idToken == nil {
                    resultData.idToken = refreshingToken?.idToken
                }
                guard self.accessToken == refreshingToken else {
                    return
                }
                try await self.setAccessToken(resultData)
            case 400...499${additionalTokenFailureStatusCodes}: /// These status codes indicate a problem with the client's request which we believe are reasonable to treat as meaning that the current refresh token is no longer viable.
                ${log({ level: 'error', msg: 'Refresh request failed with status code \\(result.response.statusCode)' })}
                if self.accessToken == refreshingToken {
                    try await self.setAccessToken(nil)
                }
                throw APIError.authenticationFailed(result.response, data: result.data)
            default:
                ${log({ level: 'error', msg: 'Refresh request had unexpected response with status code \\(result.response.statusCode)' })}
                throw APIError.unexpectedResponse(result.response, data: result.data)
            }
        }
        
        refreshTask = t
        defer {
            refreshTask = nil
        }
        try await t.value
    }

    func refreshToken(failedRequest: URLRequest) async throws {
        guard let token = accessToken?.accessToken else {
            try await refreshToken()
            return
        }

        if let authorizationHeader = failedRequest.value(forHTTPHeaderField: "Authorization") {
            if authorizationHeader == self.authorizationHeader(token: token) {
                // The failed request was using our current access token, so refresh
                try await refreshToken()
                return
            }
        }

        // Wait for an existing refresh task, if there is one
        if let t = refreshTask {
            let _ = try await t.value
            return
        }

        // Try again with the current access token (it's not the one that the failed request used)
    }
    
    private func createRefreshRequest(_ token: String, url: URL) -> URLRequest {
        return createOAuthRequest(url: url, params: clientParams.merging([
            "grant_type" : "refresh_token",
            "refresh_token": token,
        ], uniquingKeysWith: { (_, new) in new }))
    }
    
    /// The access token, refreshing it first if it is missing or has expired.
    func validAccessToken() async throws -> String {
        if accessToken?.accessToken == nil || accessToken?.isExpired == true {
            try await refreshToken()
        }
        
        guard let token = accessToken?.accessToken else {
            ${log({ level: 'error', msg: 'No access token available for authorization' })}
            throw APIError.notAuthenticated
        }
        return token
    }

    func authorize(request: inout URLRequest) async throws {
        let token = try await validAccessToken()
        
        // Get the token and stick it on the URL Request
        request.setValue(authorizationHeader(token: token), forHTTPHeaderField: "Authorization")
    }

    private func authorizationHeader(token: String) -> String {
        "Bearer \\(token)"
    }

    func revokeRefreshToken(url: URL) async throws {
        guard let token = accessToken?.refreshToken else {
            // There is no token to revoke
            return
        }
        
        ${log({ level: 'debug', msg: 'Revoking refresh token' })}
        let request = createOAuthRequest(url: url, params: clientParams.merging([
            "token_type_hint": "refresh_token",
            "token": token,
        ], uniquingKeysWith: { (_, new) in new }))
        
        let result = try await configuration.transport.handleApiRequest(request, retryConfiguration: configuration.retryConfiguration)
        switch result.response.statusCode {
        case 200:
            self.accessToken?.refreshToken = nil
            /* There's nothing left to refresh with */
            restartPreemptiveRefresh()
            configuration.accessTokenDidChange?(accessToken)
        default:
            throw APIError.authenticationFailed(result.response, data: result.data)
        }
    }

    func revokeAccessToken(url: URL) async throws {
        guard let token = accessToken?.accessToken else {
            // There is no token to revoke
            return
        }

        ${log({ level: 'debug', msg: 'Revoking access token' })}
        let request = createOAuthRequest(url: url, params: clientParams.merging([
            "token_type_hint": "access_token",
            "token": token,
        ], uniquingKeysWith: { (_, new) in new }))
        
        let result = try await configuration.transport.handleApiRequest(request, retryConfiguration: configuration.retryConfiguration)
        switch result.response.statusCode {
        case 200:
            self.accessToken?.accessToken = nil
            configuration.accessTokenDidChange?(accessToken)
        default:
            throw APIError.authenticationFailed(result.response, data: result.data)
        }
    }
    
}`
}
