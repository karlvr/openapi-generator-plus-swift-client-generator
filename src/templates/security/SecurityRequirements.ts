import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

/**
 * The security requirements of an operation, as data, and the implementation
 * that applies them to a request.
 *
 * Each operation's requirements are generated as a value of this type, rather
 * than as code, so that the request can be authorized at the point it's sent
 * rather than at the point it's built. That's what lets a caller modify a
 * request before sending it, and what lets a 401 be recovered from by
 * reauthenticating and authorizing the same request again.
 */
export function securityRequirements(root: RootContext): string {
	return ts`
//
//  ${generatedBy(root)}
//

import Foundation

/// The security requirements of an operation. One of the requirements must be satisfied, unless \`optional\` is \`true\`.
public struct SecurityRequirements: Swift.Sendable {

    /// A security scheme, and the scopes required of it.
    public struct Scheme: Swift.Sendable {
        public let securityScheme: SecurityScheme
        public let scopes: [Swift.String]

        public init(securityScheme: SecurityScheme, scopes: [Swift.String]) {
            self.securityScheme = securityScheme
            self.scopes = scopes
        }
    }

    /// The security schemes that must _all_ be satisfied in order to meet this requirement.
    public struct Requirement: Swift.Sendable {
        public let schemes: [Scheme]

        public init(schemes: [Scheme]) {
            self.schemes = schemes
        }
    }

    /// The alternative requirements, any _one_ of which satisfies the operation.
    public let requirements: [Requirement]

    /// Whether the operation may be requested without satisfying any of the requirements.
    public let optional: Swift.Bool

    public init(requirements: [Requirement], optional: Swift.Bool) {
        self.requirements = requirements
        self.optional = optional
    }
}

extension SecurityRequirements {

    /**
     Return \`request\` authorized for the first requirement that the \`securityClient\` can satisfy.

     If the \`securityClient\` is \`nil\` the request is returned unchanged, as there is no way to authorize it.

     - Parameters:
        - request: The request to authorize.
        - securityClient: The client to authorize with, if one is configured.

     - Throws: The last error encountered, if none of the requirements could be satisfied and the requirements aren't \`optional\`.
     */
    func authorize(_ request: URLRequest, securityClient: SecurityClient?) async throws -> URLRequest {
        guard let securityClient = securityClient else {
            return request
        }

        var lastError: Error?
        for requirement in requirements {
            var authorizedRequest = request
            do {
                for scheme in requirement.schemes {
                    do {
                        try await securityClient.authorize(request: &authorizedRequest, securityScheme: scheme.securityScheme, scopes: scheme.scopes)
                    } catch APIError.notAuthenticated {
                        try await securityClient.reauthenticate(failedRequest: authorizedRequest, securityScheme: scheme.securityScheme, scopes: scheme.scopes)
                        try await securityClient.authorize(request: &authorizedRequest, securityScheme: scheme.securityScheme, scopes: scheme.scopes)
                    }
                }
                return authorizedRequest
            } catch (let error) {
                lastError = error
            }
        }

        if !optional, let lastError = lastError {
            throw lastError
        }
        return request
    }

    /**
     Reauthenticate the first requirement that the \`securityClient\` can satisfy, after a request received a 401 response.

     - Parameters:
        - failedRequest: The request that received the 401 response.
        - securityClient: The client to reauthenticate with.

     - Throws: The last error encountered, if none of the requirements could be reauthenticated and the requirements aren't \`optional\`.
     */
    func reauthenticate(failedRequest: URLRequest, securityClient: SecurityClient) async throws {
        var lastError: Error?
        for requirement in requirements {
            do {
                for scheme in requirement.schemes {
                    try await securityClient.reauthenticate(failedRequest: failedRequest, securityScheme: scheme.securityScheme, scopes: scheme.scopes)
                }
                return
            } catch (let error) {
                lastError = error
            }
        }

        if !optional, let lastError = lastError {
            throw lastError
        }
    }
}
`
}
