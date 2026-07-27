import { CodegenHierarchySchema, CodegenOneOfSchema } from '@openapi-generator-plus/types'
import { ts } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from './types'
import { generatedBy } from './frag/generatedBy'
import { oneOfContents } from './frag/oneOf'

/** A Swift source file containing the enum for a oneOf or hierarchy schema. */
export function oneOf(schema: CodegenOneOfSchema | CodegenHierarchySchema, ctx: SwiftContext): string {
	return ts`
//
// ${schema.name}.swift
//
// ${generatedBy(ctx.root)}
//

import Foundation

${oneOfContents(schema, ctx)}
`
}
