import {
	CodegenScope,
	isCodegenEnumSchema,
	isCodegenHierarchySchema,
	isCodegenInterfaceSchema,
	isCodegenObjectSchema,
	isCodegenOneOfSchema,
	isCodegenWrapperSchema,
} from '@openapi-generator-plus/types'
import { SKIP, Skip } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { enumContents } from './enum'
import { interfaceContents } from './interface'
import { oneOfContents } from './oneOf'
import { pojoContents } from './pojo'
import { wrapperContents } from './wrapper'
import { values } from './helpers'

/**
 * The schemas nested inside `scope`, rendered as nested Swift types, or SKIP
 * when there are none. Schema types that have no Swift representation of their
 * own are omitted.
 */
export function nestedSchemas(scope: CodegenScope, ctx: SwiftContext): string | Skip {
	const rendered: string[] = []
	for (const schema of values(scope.schemas)) {
		if (isCodegenEnumSchema(schema)) {
			rendered.push(enumContents(schema))
		} else if (isCodegenInterfaceSchema(schema)) {
			rendered.push(interfaceContents(schema, ctx))
		} else if (isCodegenObjectSchema(schema)) {
			rendered.push(pojoContents(schema, ctx))
		} else if (isCodegenWrapperSchema(schema)) {
			rendered.push(wrapperContents(schema, ctx))
		} else if (isCodegenOneOfSchema(schema) || isCodegenHierarchySchema(schema)) {
			rendered.push(oneOfContents(schema, ctx))
		}
	}
	if (!rendered.length) {
		return SKIP
	}
	/* Each nested schema is followed by a blank line, including the last. */
	return `${rendered.join('\n\n')}\n`
}
