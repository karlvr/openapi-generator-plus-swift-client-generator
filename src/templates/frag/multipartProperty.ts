import { CodegenContentPropertyEncoding, CodegenSchemaUsage } from '@openapi-generator-plus/types'
import { identifier, isFile, stringLiteral, ts } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'

export interface MultipartPropertyOptions {
	/** The expression containing the property value. */
	propertyVar: string
	/** The name of the variable containing the list of body parts. */
	bodyPartsVar: string
	/** The schema usage for the value. */
	schemaUsage: CodegenSchemaUsage
	/** Set once the optionality of the value has been unwrapped. */
	handledRequired?: boolean
	/** Set once the nullability of the value has been unwrapped. */
	handledNullable?: boolean
}

/** The statements that add one property of a multipart request body to the body parts. */
export function multipartProperty(encoding: CodegenContentPropertyEncoding, options: MultipartPropertyOptions, ctx: SwiftContext): string {
	const { schemaUsage } = options

	if (!schemaUsage.required && !options.handledRequired) {
		return ts`
if let value = ${options.propertyVar} { // required
    ${multipartProperty(encoding, { ...options, propertyVar: 'value', handledRequired: true }, ctx)}
}`
	}
	if (schemaUsage.nullable && !options.handledNullable) {
		return ts`
if let value = ${options.propertyVar}.value { // nullable
    ${multipartProperty(encoding, { ...options, propertyVar: 'value', handledNullable: true }, ctx)}
}`
	}

	/* The value is either the property itself, or a value property inside a container object. */
	const valueProperty = encoding.valueProperty
	const valueSchema = valueProperty ? valueProperty.schema : schemaUsage
	const value = valueProperty ? `${options.propertyVar}.${identifier(ctx.generatorContext.generator(), valueProperty.name)}` : options.propertyVar

	const name = stringLiteral(ctx.generatorContext, encoding.property.serializedName)
	const contentType = stringLiteral(ctx.generatorContext, encoding.contentType)

	if (isFile(valueSchema)) {
		return `${options.bodyPartsVar}.append(${name}, ${value}, ${contentType})`
	}
	if (encoding.contentType === 'application/json') {
		return `${options.bodyPartsVar}.append(${name}, try JSONEncoder().encode(${value}), ${contentType}, nil)`
	}
	if (encoding.contentType === 'application/octet-stream') {
		return `${options.bodyPartsVar}.append(${name}, ${value}, ${contentType}, nil)`
	}
	return `${options.bodyPartsVar}.append(${name}, String(${value}), ${contentType})`
}
