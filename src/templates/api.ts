import { CodegenOperationGroup } from '@openapi-generator-plus/types'
import { each, ts } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from './types'
import { generatedBy } from './frag/generatedBy'
import { operation } from './frag/operation'
import { parametersProtocol } from './frag/parametersProtocol'
import { apiType, requestBuilderType, usesParametersStruct } from './frag/helpers'

/** The API struct for an operation group, with a method per operation. */
export function api(group: CodegenOperationGroup, ctx: SwiftContext): string {
	const body = ts`
//
// ${apiType(group)}.swift
//
// ${generatedBy(ctx.root)}
//

import Foundation

public struct ${apiType(group)}: Swift.Sendable {

    /* Internal, so that the strongly-typed methods below are what's reached for. A caller that
       needs to customise a request makes their own \`${requestBuilderType(group)}\`. */
    let requestBuilder: ${requestBuilderType(group)}

    public init(configuration: Configuration) {
        self.requestBuilder = ${requestBuilderType(group)}(configuration: configuration)
    }

    ${each(group.operations, op => operation(op, group, ctx), '\n')}
}

`

	/* The parameters protocols live outside the API struct, so that a caller can conform their own types to them. */
	const protocols = group.operations
		.filter(usesParametersStruct)
		.map(op => `${parametersProtocol(op, group, ctx)}\n\n`)
		.join('')

	return body + protocols
}
