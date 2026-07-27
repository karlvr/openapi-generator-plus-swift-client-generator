import { CodegenExternalDocs } from '@openapi-generator-plus/types'
import { SKIP, Skip, maybe, ts } from '@openapi-generator-plus/template-utils'
import { indentLines } from './helpers'

/** The documentation comment for a schema, or SKIP when there's nothing to document. */
export function schemaDocumentation(schema: { description: string | null; externalDocs: CodegenExternalDocs | null }): string | Skip {
	if (!schema.description && !schema.externalDocs) {
		return SKIP
	}

	return ts`
/**
${maybe(schema.description, description => ` * ${indentLines(description, ' * ')}`)}
${maybe(schema.externalDocs, externalDocs => ts`
 * <p>External documentation: ${externalDocs.url}</p>
${maybe(externalDocs.description, description => ` * ${indentLines(description, ' * ')}`)}`)}
 */`
}
