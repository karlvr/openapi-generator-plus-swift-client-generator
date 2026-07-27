import { CodegenSchemaUsage } from '@openapi-generator-plus/types'
import { stringLiteral } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { schemaToString } from './schemaToString'

/** An expression joining the elements of the array in `value` into a single URL-encoded string. */
export function arrayToString(usage: CodegenSchemaUsage, value: string, separator: string, ctx: SwiftContext): string {
	const component = usage.schema.component
	if (!component) {
		throw new Error(`arrayToString requires an array schema with a component: ${usage.schema.name}`)
	}
	return `${value}.map { localVarArrayMapElement in ${schemaToString(component, 'localVarArrayMapElement')}.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)! }.joined(separator: ${stringLiteral(ctx.generatorContext, separator)})`
}
