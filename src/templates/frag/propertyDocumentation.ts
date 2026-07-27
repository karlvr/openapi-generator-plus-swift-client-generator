import { CodegenNumericSchema, CodegenParameter, CodegenProperty } from '@openapi-generator-plus/types'
import { SKIP, Skip, isNumeric } from '@openapi-generator-plus/template-utils'
import { indentLines } from './helpers'

/**
 * The documentation comment for a property or parameter: its description
 * followed by any numeric constraints, or SKIP when there's nothing to
 * document.
 */
export function propertyDocumentation(property: CodegenProperty | CodegenParameter): string | Skip {
	const lines: string[] = []
	if (property.description) {
		lines.push(property.description)
	}
	if (isNumeric(property.schema)) {
		const schema = property.schema as CodegenNumericSchema
		if (schema.minimum) {
			lines.push(`Minimum: ${schema.minimum}`)
		}
		if (schema.maximum) {
			lines.push(`Maximum: ${schema.maximum}`)
		}
	}

	/* A description may itself be multi-line; blank lines are dropped. */
	const description = lines.join('\n').split(/\r?\n/).filter(line => line.trim().length > 0).join('\n')
	if (!description) {
		return SKIP
	}
	return `/// ${indentLines(description, '///')}`
}
