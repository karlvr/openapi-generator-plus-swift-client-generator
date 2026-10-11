import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

export function oauthAccessToken(root: RootContext): string {
	return ts`
//  
//  ${generatedBy(root)}
//

import Foundation

/// The tokens that an OAuth 2.0 token endpoint issues.
///
/// It's \`Codable\`, including when it was issued, so that it can be persisted, for example in the keychain, and restored with its expiry intact.
public struct OAuthAccessToken : Swift.Codable, Swift.Equatable, Swift.Sendable {
    public var accessToken: String?
    public var tokenType: String?
    public var refreshToken: String?
    public var expiresIn: TimeInterval?
    public var scope: String?
    /// The OpenID Connect ID token, if the server issued one.
    public var idToken: String?
    
    /// When the token was issued, which is when the request for it was made.
    public var createdAt: Date?

    /// When the access token expires, if known.
    public var expiresAt: Date? {
        guard let createdAt = createdAt, let expiresIn = expiresIn else {
            return nil
        }
        return createdAt.addingTimeInterval(expiresIn)
    }

    public var isExpired: Bool {
        guard let expiresAt = expiresAt else {
            return false // We don't know in this situation so best to assume the token is valid and have the API try it
        }
        
        return expiresAt <= Date()
    }
    
    public init(accessToken: String? = nil, tokenType: String? = nil, refreshToken: String? = nil, expiresIn: TimeInterval? = nil, scope: String? = nil, idToken: String? = nil, createdAt: Date? = nil) {
        self.accessToken = accessToken
        self.tokenType = tokenType
        self.refreshToken = refreshToken
        self.expiresIn = expiresIn
        self.scope = scope
        self.idToken = idToken
        self.createdAt = createdAt
    }

    enum CodingKeys: String, Swift.CodingKey, Swift.CaseIterable {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
        case scope
        case idToken = "id_token"
        case createdAt = "created_at"
    }

    // Codable protocol methods

    public init(from decoder: Swift.Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        accessToken = try container.decodeIfPresent(String.self, forKey: .accessToken)
        tokenType = try container.decodeIfPresent(String.self, forKey: .tokenType)
        refreshToken = try container.decodeIfPresent(String.self, forKey: .refreshToken)
        /* Some servers send expires_in as a string */
        if let seconds = try? container.decodeIfPresent(TimeInterval.self, forKey: .expiresIn) {
            expiresIn = seconds
        } else if let seconds = try? container.decodeIfPresent(String.self, forKey: .expiresIn) {
            expiresIn = TimeInterval(seconds)
        } else {
            expiresIn = nil
        }
        scope = try container.decodeIfPresent(String.self, forKey: .scope)
        idToken = try container.decodeIfPresent(String.self, forKey: .idToken)
        /* A token endpoint may send a created_at of its own, in a form we don't know, so we don't fail on it. The client replaces it with the time of the request. */
        createdAt = try? container.decodeIfPresent(Date.self, forKey: .createdAt)
    }

    public func encode(to encoder: Swift.Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(accessToken, forKey: .accessToken)
        try container.encodeIfPresent(tokenType, forKey: .tokenType)
        try container.encodeIfPresent(refreshToken, forKey: .refreshToken)
        try container.encodeIfPresent(expiresIn, forKey: .expiresIn)
        try container.encodeIfPresent(scope, forKey: .scope)
        try container.encodeIfPresent(idToken, forKey: .idToken)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
    }
}
`
}
