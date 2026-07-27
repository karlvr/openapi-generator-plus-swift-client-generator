import { CodegenWrapperSchema } from '@openapi-generator-plus/types'
import { ts } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from './types'
import { generatedBy } from './frag/generatedBy'
import { wrapperContents } from './frag/wrapper'

/** A Swift source file containing the struct for a wrapper schema. */
export function wrapper(schema: CodegenWrapperSchema, ctx: SwiftContext): string {
	return ts`
//
// ${schema.name}.swift
//
// ${generatedBy(ctx.root)}
//

import Foundation

${wrapperContents(schema, ctx)}
`
}
