import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

/** The transport that sends requests, its `URLSession` implementation, and the automatic retry of 429 and any additional configured status codes. */
export function apiTransport(root: RootContext): string {
	return ts`
//
//  ${generatedBy(root)}
//

import Foundation

/**
 Sends API requests and returns their responses.

 The client sends every request through a transport, after the request has been authorized and
 finalized. The default transport sends requests with a \`URLSession\`. Provide your own to send
 requests another way, or to answer them without a network, for example from fixtures in tests.
 */
public protocol APITransport: Swift.Sendable {
    /**
     Send \`request\` and return the response.
     - Parameter request: The request, ready to send.
     - Returns: The response body and the response.
     - Throws: An error if the request couldn't be sent or no response was received.
     */
    func send(_ request: Foundation.URLRequest) async throws -> (Foundation.Data, Foundation.URLResponse)
}

/** An \`APITransport\` that sends requests with a \`URLSession\`. */
public struct URLSessionAPITransport: APITransport {

    /** The transport used when a configuration doesn't name one. It uses a \`URLSession\` with the default configuration. */
    public static let \`default\` = URLSessionAPITransport(session: Foundation.URLSession(configuration: .default))

    public let session: Foundation.URLSession

    /**
     Create a transport that sends requests with \`session\`.
     - Parameter session: The session to send requests with. Use a session of your own to control caching, timeouts or protocol classes.
     */
    public init(session: Foundation.URLSession) {
        self.session = session
    }

    public func send(_ request: Foundation.URLRequest) async throws -> (Foundation.Data, Foundation.URLResponse) {
        return try await session.data(for: request)
    }
}

extension APITransport {

    func handleApiRequest(_ request: Foundation.URLRequest, attemptsTried: Int = 0, retryConfiguration: RetryConfiguration?) async throws -> APIResponse {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await send(request)
        } catch {
            throw APIError.urlSessionError(error, request: request)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unexpectedResponse(response, data: data)
        }

        let nanosecondsPerSecond: Double = 1_000_000_000

        let result = APIResponse(response: httpResponse, data: data)
        guard let retryConfiguration = retryConfiguration else {
            return result
        }

        switch result.response.statusCode {
            case 429${root.additionalRetryStatusCodes.filter(code => Number(code) !== 429).map(code => `, ${code}`).join('')}:
                if attemptsTried >= retryConfiguration.maxAttempts {
                    throw APIError.unexpectedResponse(response, data: data)
                }
                let delay = pow(retryConfiguration.scaleFactor, Double(attemptsTried)) * retryConfiguration.delay
                try await Task.sleep(nanoseconds: UInt64(delay * nanosecondsPerSecond))
                return try await handleApiRequest(request, attemptsTried: attemptsTried + 1, retryConfiguration: retryConfiguration)
            default:
                return result
        }
    }
}`
}
