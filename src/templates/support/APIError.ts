import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

export function apiError(root: RootContext): string {
	return ts`
//  
//  ${generatedBy(root)}
//

import Foundation

/// Errors that occur while using the API
public enum APIError: Swift.Error {
    /// The security client is not authenticated
    case notAuthenticated

    /// The authentication request failed
    case authenticationFailed(_ response: HTTPURLResponse, data: Foundation.Data)

    /// A response was received that could not be decoded
    case invalidResponse(_ error: Swift.Error, response: Foundation.HTTPURLResponse, data: Foundation.Data)

    /// The API requested authentication using a \`SecurityScheme\` that has not been configured in the \`SecurityClientController\`
    case securitySchemeNotConfigured(_ securityScheme: SecurityScheme)

    /// An response was received with an undocumented status code
    case unexpectedResponse(_ response: Foundation.URLResponse, data: Foundation.Data)

    /// An error thrown by URLSession. Can be \`Foundation.URLError\`, \`Swift.CancellationError\`, or something unknown.
    case urlSessionError(_ error: Swift.Error, request: Foundation.URLRequest)
}
`
}
