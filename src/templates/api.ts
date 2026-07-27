import { CodegenOperationGroup, CodegenServer } from '@openapi-generator-plus/types'
import { each, stringLiteral, ts, when } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from './types'
import { generatedBy } from './frag/generatedBy'
import { logHeader } from './frag/logHeader'
import { operation } from './frag/operation'
import { parametersProtocol } from './frag/parametersProtocol'
import { parameterCount } from './frag/helpers'

/** The API struct for an operation group, with a method per operation. */
export function api(group: CodegenOperationGroup, servers: CodegenServer[] | null, ctx: SwiftContext): string {
	const firstServer = servers && servers.length ? servers[0] : null

	const body = ts`
//
// ${group.name}Api.swift
//
// ${generatedBy(ctx.root)}
//

import Foundation
${logHeader(`${group.name}Api`, ctx.root)}

public struct ${group.name}Api: Swift.Sendable {

    var configuration: Configuration
    var basePath: String
    var cachePolicy: URLRequest.CachePolicy
    var timeoutInterval: TimeInterval

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

    ${each(group.operations, op => operation(op, group, ctx), '\n')}
}

`

	/* The parameters protocols live outside the API struct, so that a caller can conform their own types to them. */
	const protocols = group.operations
		.filter(op => parameterCount(op.parameters) > 1)
		.map(op => `${parametersProtocol(op, group, ctx)}\n\n`)
		.join('')

	return body + protocols
}
