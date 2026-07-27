import { CodegenObjectSchema } from '@openapi-generator-plus/types'
import { ts } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from './types'
import { generatedBy } from './frag/generatedBy'
import { pojoContents } from './frag/pojo'

/** A Swift source file containing the struct for an object schema. */
export function pojo(schema: CodegenObjectSchema, ctx: SwiftContext): string {
	return ts`
//
// ${schema.name}.swift
//
// ${generatedBy(ctx.root)}
//

import Foundation

${pojoContents(schema, ctx)}
`
}
