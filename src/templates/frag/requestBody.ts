import { CodegenContent, CodegenObjectSchema, CodegenRequestBody, CodegenSchemaType } from '@openapi-generator-plus/types'
import { allProperties, each, identifier, isArray, isString, stringLiteral, ts } from '@openapi-generator-plus/template-utils'
import * as idx from '@openapi-generator-plus/indexed-type'
import { SwiftContext } from '../types'
import { requestParameter } from './requestParameter'
import { multipartProperty } from './multipartProperty'

/** The statements that build a form-url-encoded body from the request body's properties. */
function formUrlEncodedBody(content: CodegenContent, name: string, ctx: SwiftContext): string {
	return ts`
var localVarFormParams = [NameValuePair]()
${each(allProperties(content.schema as CodegenObjectSchema), property => requestParameter(property, {
	dest: 'localVarFormParams',
	value: `${name}.${property.name}`,
	encoding: content.encoding ? idx.get(content.encoding.properties, property.name) : undefined,
}, ctx), '\n')}
localVarRequest.httpBody = localVarFormParams.toString(separator: "&").data(using: .utf8)!`
}

/** The statements that build a multipart body from the request body's properties. */
function multipartBody(content: CodegenContent, name: string, ctx: SwiftContext): string {
	const encodings = content.encoding ? idx.allValues(content.encoding.properties) : []

	return ts`
var localVarFormData = FormData()
${each(encodings, encoding => {
	const property = encoding.property
	if (!isArray(property)) {
		return multipartProperty(encoding, {
			propertyVar: `${name}.${property.name}`,
			bodyPartsVar: 'localVarFormData',
			schemaUsage: property,
		}, ctx)
	}

	const component = property.schema.component
	if (!component) {
		throw new Error(`Multipart array property has no component schema: ${property.name}`)
	}
	const element = multipartProperty(encoding, {
		propertyVar: '$0',
		bodyPartsVar: 'localVarFormData',
		schemaUsage: component,
	}, ctx)

	if (!property.required || property.nullable) {
		const unwrapNullable = property.nullable ? `${property.required ? '' : '?'}.value` : ''
		return ts`
if let ${property.name} = ${name}.${property.name}${unwrapNullable} {
    ${property.name}.forEach {
        ${element}
    }
}`
	}
	return ts`
${name}.${property.name}.forEach {
    ${element}
}`
}, '\n')}
localVarRequest.httpBody = localVarFormData.data
localVarHeaderParameter.set("Content-Type", localVarFormData.contentType)`
}

/** The statements that build the HTTP body for a request body, according to its media type. */
export function requestBody(request: CodegenRequestBody, ctx: SwiftContext): string {
	const content = request.defaultContent
	const name = request.name

	function contentBody(): string {
		switch (content.mediaType.mimeType) {
			case 'application/x-www-form-urlencoded':
				return formUrlEncodedBody(content, name, ctx)
			case 'application/json':
			case 'text/json':
				return `localVarRequest.httpBody = try JSONEncoder().encode(${identifier(ctx.generatorContext.generator(), name)})`
		}
		if (content.mediaType.mimeType.endsWith('+json')) {
			return `localVarRequest.httpBody = try JSONEncoder().encode(${identifier(ctx.generatorContext.generator(), name)})`
		}
		if (/multipart\/.*/i.test(content.mediaType.mimeType)) {
			return multipartBody(content, name, ctx)
		}
		if (isString(content as { schema?: { schemaType?: CodegenSchemaType } })) {
			return `localVarRequest.httpBody = ${name}.data(using: .utf8)!`
		}
		return `localVarRequest.httpBody = ${name}`
	}

	return ts`
localVarHeaderParameter.set("Content-Type", ${stringLiteral(ctx.generatorContext, content.mediaType.mediaType)})

${contentBody()}`
}
