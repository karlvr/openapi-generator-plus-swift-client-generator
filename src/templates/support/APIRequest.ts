import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { logHeader } from '../frag/logHeader'
import { log } from '../frag/log'
import { RootContext } from '../types'

/**
 * A request that has been built for an operation but not yet sent, and the
 * request handling that sends it.
 *
 * The request is built by an operation group's request builder, and is exposed
 * so that it can be modified before it's sent — to make a request that the API
 * specification doesn't describe, while still going through the client's
 * security, retry and response handling.
 */
export function apiRequest(root: RootContext): string {
	return ts`
//
//  ${generatedBy(root)}
//

import Foundation
${logHeader('APIRequest', root)}

/// A request that's ready to be sent, and that knows how to parse its response.
public struct APIRequest<Result: Swift.Sendable>: Swift.Sendable {

    /// The request that will be sent, before its security and the configuration's
    /// \`finalizeRequestBlock\` are applied. Modify it to customise the request.
    public var urlRequest: Foundation.URLRequest

    /// The configuration used to send the request.
    public let configuration: Configuration

    /// The security requirements to satisfy when sending the request, if the operation has any.
    public let securityRequirements: SecurityRequirements?

    /// Parse the response of the request into the operation's result.
    public let parse: @Sendable (_ request: Foundation.URLRequest, _ response: APIResponse) throws -> Result

    public init(
        urlRequest: Foundation.URLRequest,
        configuration: Configuration,
        securityRequirements: SecurityRequirements? = nil,
        parse: @escaping @Sendable (_ request: Foundation.URLRequest, _ response: APIResponse) throws -> Result
    ) {
        self.urlRequest = urlRequest
        self.configuration = configuration
        self.securityRequirements = securityRequirements
        self.parse = parse
    }

    /**
     The request as it will be sent: with its security requirements satisfied, and the
     configuration's \`finalizeRequestBlock\` applied.

     - Throws: An \`Error\` if the request's security requirements couldn't be satisfied.
     */
    public func finalizedURLRequest() async throws -> Foundation.URLRequest {
        var result = urlRequest
        if let securityRequirements = securityRequirements {
            result = try await securityRequirements.authorize(result, securityClient: configuration.securityClient)
        }
        if let finalizeRequestBlock = configuration.finalizeRequestBlock {
            finalizeRequestBlock(&result)
        }
        return result
    }

    /**
     Send the request and parse the response into the operation's result.

     - Throws: An \`APIError\` if the request failed, or if the response couldn't be parsed.
     */
    public func execute() async throws -> Result {
        do {
            let (request, response) = try await send(allowsReauth: true)
            return try parse(request, response)
        } catch let error as APIError {
            configuration.onError?(error)
            throw error
        }
    }

    /**
     Send the request and return the response without parsing it.

     - Throws: An \`APIError\` if the request failed.
     */
    public func executeUnparsed() async throws -> APIResponse {
        do {
            return try await send(allowsReauth: true).response
        } catch let error as APIError {
            configuration.onError?(error)
            throw error
        }
    }

    /**
     Send the request and parse the response into the operation's result.

     - Parameters:
        - responseQueue: The queue to call \`completion\` on, or the configuration's \`responseQueue\` if \`nil\`.
        - completion: Called with the operation's result, or the error that occurred.
     */
    public func execute(responseQueue: Dispatch.DispatchQueue? = nil, completion: @escaping (@Sendable (_ result: Swift.Result<Result, Error>) -> Void)) {
        let responseQueue = responseQueue ?? configuration.responseQueue
        Task {
            do {
                let result = try await execute()
                responseQueue.asyncIfPresent {
                    completion(.success(result))
                }
            } catch {
                responseQueue.asyncIfPresent {
                    completion(.failure(error))
                }
            }
        }
    }

    /**
     Send the request and return the response without parsing it.

     - Parameters:
        - responseQueue: The queue to call \`completion\` on, or the configuration's \`responseQueue\` if \`nil\`.
        - completion: Called with the response, or the error that occurred.
     */
    public func executeUnparsed(responseQueue: Dispatch.DispatchQueue? = nil, completion: @escaping (@Sendable (_ result: Swift.Result<APIResponse, Error>) -> Void)) {
        let responseQueue = responseQueue ?? configuration.responseQueue
        Task {
            do {
                let result = try await executeUnparsed()
                responseQueue.asyncIfPresent {
                    completion(.success(result))
                }
            } catch {
                responseQueue.asyncIfPresent {
                    completion(.failure(error))
                }
            }
        }
    }

    /**
     Send the request, recovering from a 401 response by reauthenticating and sending it again.

     Returns the request as it was sent, as well as the response, as the request that was sent
     is the one to report in errors and logging.
     */
    private func send(allowsReauth: Bool) async throws -> (request: Foundation.URLRequest, response: APIResponse) {
        let request = try await finalizedURLRequest()
        ${log({ level: 'debug', msg: 'Requesting \\(request)' })}

        let response = try await URLSession.handleApiRequest(request, retryConfiguration: configuration.retryConfiguration)

        /* A 401 is only ours to recover from if the operation has security requirements; otherwise it's
           just another response, and it's for the operation's own response handling to deal with. */
        if response.response.statusCode == 401, let securityRequirements = securityRequirements {
            guard allowsReauth, let securityClient = configuration.securityClient else {
                ${log({ level: 'debug', msg: '\\(request) Received 401 response, throwing APIError.authenticationFailed' })}
                throw APIError.authenticationFailed(response.response, data: response.data)
            }

            ${log({ level: 'debug', msg: '\\(request) Received 401 response, attempting to reauthenticate' })}
            try await securityRequirements.reauthenticate(failedRequest: request, securityClient: securityClient)
            return try await send(allowsReauth: false)
        }

        return (request, response)
    }
}
`
}
