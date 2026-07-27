import { CodegenSchemaUsage } from '@openapi-generator-plus/types'
import { isArray, isObject } from '@openapi-generator-plus/template-utils'

/**
 * An expression converting `value`, a value of the given schema usage, to a
 * `String` for use in a URL or form-encoded body.
 *
 * The behaviour for nested objects and arrays is undefined by the spec, but
 * editor.swagger.io transforms these into JSON, so we do too.
 */
export function schemaToString(usage: CodegenSchemaUsage, value: string): string {
	const unwrapped = usage.nullable ? `${value}.value!` : value
	const result = isObject(usage) || isArray(usage)
		? `String(data: try! JSONEncoder().encode(${unwrapped}), encoding: .utf8)`
		: `String(${unwrapped})`
	return usage.nullable ? `(${value}.value != nil ? ${result} : "")` : result
}
