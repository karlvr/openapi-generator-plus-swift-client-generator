import { CodegenLogLevel, CodegenObjectSchema, CodegenParameterEncoding, CodegenProperty, CodegenSchemaUsage } from '@openapi-generator-plus/types'
import { Skip, allProperties, each, isArray, isObject, ts } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { schemaToString } from './schemaToString'
import { arrayToString } from './arrayToString'
import { objectToString } from './objectToString'

/** A schema usage that carries a serialized name: a parameter or a property. */
export type NamedSchemaUsage = CodegenSchemaUsage & { serializedName: string }

export interface RequestParameterOptions {
	/** The name of the collection to append the name/value pairs to. */
	dest: string
	/** The expression containing the value. */
	value: string
	/** The encoding to use for the parameter. */
	encoding: CodegenParameterEncoding | null | undefined
	/** Set once the optionality of the value has been unwrapped. */
	handledRequired?: boolean
	/** Set once the nullability of the value has been unwrapped. */
	handledNullable?: boolean
}

/** Append the properties of an object one at a time, either as bare names or in `deepObject` brackets. */
function explodedObject(usage: NamedSchemaUsage, options: RequestParameterOptions, name: (property: CodegenProperty) => string): string | Skip {
	return each(allProperties(usage.schema as CodegenObjectSchema), property => {
		if (property.required) {
			return `${options.dest}.append(NameValuePair(name: "${name(property)}", value: ${schemaToString(property, `${options.value}.${property.name}`)}))`
		}
		return ts`
if let ${property.name} = ${options.value}.${property.name} {
    ${options.dest}.append(NameValuePair(name: "${name(property)}", value: ${schemaToString(property, property.name)}))
}`
	}, '\n')
}

/** The statements that append an array-valued parameter, according to its encoding style. */
function arrayParameter(usage: NamedSchemaUsage, options: RequestParameterOptions, ctx: SwiftContext): string {
	const { dest, value, encoding } = options
	const append = (comment: string, separator: string) => ts`
/* ${comment} */
${dest}.append(NameValuePair(name: "${usage.serializedName}", value: ${arrayToString(usage, value, separator, ctx)}))`

	switch (encoding?.style) {
		case 'form':
			if (encoding.explode) {
				const component = usage.schema.component
				if (!component) {
					throw new Error(`Array parameter has no component schema: ${usage.serializedName}`)
				}
				return ts`
/* array form exploded */
${value}.forEach { localVarArrayElement in
    ${dest}.append(NameValuePair(name: "${usage.serializedName}", value: ${schemaToString(component, 'localVarArrayElement')}))
}`
			}
			return append('array form', ',')
		case 'spaceDelimited':
			return append('array space delimited', ' ')
		case 'pipeDelimited':
			return append('array pipe delimited', '|')
		case 'simple':
			return append('array simple', ',')
		default:
			ctx.generatorContext.log(CodegenLogLevel.WARN, `Array encoding style ${encoding?.style} not supported`)
			return 'throw new Error("Unsupported parameter encoding")\n'
	}
}

/** The statements that append an object-valued parameter, according to its encoding style. */
function objectParameter(usage: NamedSchemaUsage, options: RequestParameterOptions, ctx: SwiftContext): string {
	const { dest, value, encoding } = options
	const append = (comment: string, separator: string, keyValueSeparator: string) => ts`
/* ${comment} */
${dest}.append(NameValuePair(name: "${usage.serializedName}", value: ${objectToString(usage, value, separator, keyValueSeparator, '    ', ctx)}))`

	switch (encoding?.style) {
		case 'form':
			if (encoding.explode) {
				return ts`
/* object form exploded */
${explodedObject(usage, options, property => property.serializedName)}`
			}
			return append('object form', ',', ',')
		case 'spaceDelimited':
			return append('object space delimited', ' ', ' ')
		case 'pipeDelimited':
			return append('object pipe delimited', '|', '|')
		case 'deepObject':
			return ts`
/* object deepObject */
${explodedObject(usage, options, property => `${usage.serializedName}[${property.serializedName}]`)}`
		case 'simple':
			if (encoding.explode) {
				return append('object simple exploded', ',', '=')
			}
			return append('object simple', ',', ',')
		default:
			ctx.generatorContext.log(CodegenLogLevel.WARN, `Object encoding style ${encoding?.style} not supported`)
			return 'throw new Error("Unsupported parameter encoding")\n'
	}
}

/**
 * The statements that add a parameter to a request: unwrapping optionality and
 * nullability first, then appending the value according to its encoding.
 */
export function requestParameter(usage: NamedSchemaUsage, options: RequestParameterOptions, ctx: SwiftContext): string {
	if (!usage.required && !options.handledRequired) {
		return ts`
if let value = ${options.value} { // required
    ${requestParameter(usage, { ...options, value: 'value', handledRequired: true }, ctx)}
}`
	}

	const isCollection = isArray(usage) || isObject(usage)
	if (isCollection && usage.nullable && !options.handledNullable) {
		return ts`
if let value = ${options.value}.value { // nullable
    ${requestParameter(usage, { ...options, value: 'value', handledNullable: true }, ctx)}
}`
	}

	if (isArray(usage)) {
		return arrayParameter(usage, options, ctx)
	}
	if (isObject(usage)) {
		return objectParameter(usage, options, ctx)
	}
	return `${options.dest}.append(NameValuePair(name: "${usage.serializedName}", value: ${schemaToString(usage, options.value)}))`
}
