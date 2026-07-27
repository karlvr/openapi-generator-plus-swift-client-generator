import { CodegenInterfaceSchema } from '@openapi-generator-plus/types'
import { ts } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from './types'
import { generatedBy } from './frag/generatedBy'
import { interfaceContents } from './frag/interface'

/** A Swift source file containing the protocol for an interface schema. */
export function interfaceTemplate(schema: CodegenInterfaceSchema, ctx: SwiftContext): string {
	return ts`
//
// ${schema.name}.swift
//
// ${generatedBy(ctx.root)}
//

import Foundation

${interfaceContents(schema, ctx)}
`
}
