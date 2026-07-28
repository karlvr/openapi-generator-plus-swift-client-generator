import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

/** `URLSession` helpers, including the automatic retry of 429 and any additional configured status codes. */
export function urlSessionApi(root: RootContext): string {
	return ts`
//  
//  ${generatedBy(root)}
//

import Foundation

extension Foundation.URLSession {

    private static let apiSession = Foundation.URLSession(configuration: .default)

    @available(*, renamed: "handleApiRequest(_:retryConfiguration:)")
    static func handleApiRequest(_ request: Foundation.URLRequest, retryConfiguration: RetryConfiguration?, completion: @escaping @Sendable (_ response: Foundation.HTTPURLResponse?, _ data: Data?, _ error: Error?) -> Void) {
        Task {
            do {
                let result = try await handleApiRequest(request, retryConfiguration: retryConfiguration)
                completion(result.response, result.data, nil)
            } catch {
                completion(nil, nil, error)
            }
        }
    }
    
    static func handleApiRequest(_ request: Foundation.URLRequest, attemptsTried: Int = 0, retryConfiguration: RetryConfiguration?) async throws -> APIResponse {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await apiSession.data(for: request)
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
                return try await URLSession.handleApiRequest(request, attemptsTried: attemptsTried + 1, retryConfiguration: retryConfiguration)
            default:
                return result
        }
    }
}`
}
