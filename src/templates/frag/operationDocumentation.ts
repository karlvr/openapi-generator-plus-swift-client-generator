import { CodegenOperation } from '@openapi-generator-plus/types'
import { SKIP, Skip, maybe, ts } from '@openapi-generator-plus/template-utils'
import { indentLines } from './helpers'

/** The documentation comment for an operation, or SKIP when there's nothing to document. */
export function operationDocumentation(operation: CodegenOperation): string | Skip {
	if (!operation.summary && !operation.description && !operation.externalDocs) {
		return SKIP
	}

	return ts`
/**
${maybe(operation.summary, summary => ` * ${indentLines(summary, ' * ')}`)}
${maybe(operation.description, description => ` * ${indentLines(description, ' * ')}`)}
${maybe(operation.externalDocs, externalDocs => ts`
 * <p>External documentation: ${externalDocs.url}</p>
${maybe(externalDocs.description, description => ` * ${indentLines(description, ' * ')}`)}`)}
 */`
}
