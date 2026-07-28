import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

/** The response to an API request, before it's been parsed into an operation's result. */
export function apiResponse(root: RootContext): string {
	return ts`
//
//  ${generatedBy(root)}
//

import Foundation

/// The response to an API request.
public struct APIResponse: Swift.Sendable {

    public let response: Foundation.HTTPURLResponse
    public let data: Foundation.Data

    public init(response: Foundation.HTTPURLResponse, data: Foundation.Data) {
        self.response = response
        self.data = data
    }
}

@available(*, deprecated, renamed: "APIResponse")
public typealias URLSessionResponse = APIResponse
`
}
