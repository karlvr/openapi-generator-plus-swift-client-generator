import { CodegenObjectSchema, CodegenSchemaUsage } from '@openapi-generator-plus/types'
import { allProperties, each, stringLiteral, ts } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { schemaToString } from './schemaToString'
import { indentLines } from './helpers'

/**
 * An immediately-invoked closure that joins the properties of the object in
 * `value` into a single URL-encoded string.
 *
 * The result is spliced into the middle of a line, so every line after the
 * first — including the empty line the result ends with — is indented by
 * `indent` to line up under the opening brace.
 */
export function objectToString(
	usage: CodegenSchemaUsage,
	value: string,
	separator: string,
	keyValueSeparator: string,
	indent: string,
	ctx: SwiftContext,
): string {
	const properties = allProperties(usage.schema as CodegenObjectSchema)

	const result = ts`
{
    var values = [String]()
${each(properties, property => {
	const propertyValue = `${value}.${property.name}`
	if (property.required) {
		return `    values.append("${property.serializedName}${keyValueSeparator}" + ${schemaToString(property, propertyValue)})`
	}
	return ts`
    if let value = ${propertyValue} {
        values.append("${property.serializedName}${keyValueSeparator}" + ${schemaToString(property, 'value')})
    }`
}, '\n')}
    return values
        .map { localVarObjectElement in localVarObjectElement.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!}
        .joined(separator: ${stringLiteral(ctx.generatorContext, separator)})
}()
`
	return indentLines(result, indent)
}
