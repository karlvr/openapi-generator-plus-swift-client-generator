import { CodegenOperationGroup, CodegenServer } from '@openapi-generator-plus/types'
import { each, stringLiteral, ts, when } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from './types'
import { generatedBy } from './frag/generatedBy'
import { logHeader } from './frag/logHeader'
import { operationRequestBuilder } from './frag/operationRequestBuilder'
import { apiType, requestBuilderType } from './frag/helpers'

/**
 * The request builder for an operation group, with a method per operation that returns the
 * operation's request without sending it.
 *
 * The API struct uses this to make its requests, and it's exposed so that a caller can customise a
 * request before sending it — making a request that the API specification doesn't describe, while
 * still going through the client's security, retry and response handling.
 */
export function requestBuilder(group: CodegenOperationGroup, servers: CodegenServer[] | null, ctx: SwiftContext): string {
	const firstServer = servers && servers.length ? servers[0] : null

	return ts`
//
// ${requestBuilderType(group)}.swift
//
// ${generatedBy(ctx.root)}
//

import Foundation
${logHeader(requestBuilderType(group), ctx.root)}

/**
 Builds the requests that \`${apiType(group)}\` makes, without sending them.

 Reach for this when you need to make a request that the API specification doesn't describe: build
 the request, modify it, then send it with \`execute()\` so it still goes through the client's
 security, retries and response handling. Prefer \`${apiType(group)}\`'s own methods otherwise.
 */
public struct ${requestBuilderType(group)}: Swift.Sendable {

    public let configuration: Configuration
    public let basePath: String
    public let cachePolicy: URLRequest.CachePolicy
    public let timeoutInterval: TimeInterval

    public init(configuration: Configuration) {
        self.configuration = configuration
        if let basePath = configuration.basePath {
            self.basePath = basePath
        } else {
            ${when(firstServer, () => `self.basePath = ${stringLiteral(ctx.generatorContext, firstServer!.url)}.replacingOccurrences(of: "/", with: "", options: [.anchored, .backwards], range: nil)`)}
            ${when(!firstServer, 'self.basePath = ""')}
        }
        if let cachePolicy = configuration.cachePolicy {
            self.cachePolicy = cachePolicy
        } else {
            self.cachePolicy = URLRequest.CachePolicy.reloadIgnoringLocalAndRemoteCacheData
        }
        self.timeoutInterval = configuration.timeoutInterval
    }

    ${each(group.operations, op => operationRequestBuilder(op, group, ctx), '\n')}
}
`
}
