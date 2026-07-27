import { CodegenEnumSchema } from '@openapi-generator-plus/types'
import { ts } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from './types'
import { generatedBy } from './frag/generatedBy'
import { enumContents } from './frag/enum'

/** A Swift source file containing the enum for an enum schema. */
export function enumTemplate(schema: CodegenEnumSchema, ctx: SwiftContext): string {
	return ts`
//
// ${schema.name ?? ''}.swift
//
// ${generatedBy(ctx.root)}
//

import Foundation

${enumContents(schema)}
`
}
