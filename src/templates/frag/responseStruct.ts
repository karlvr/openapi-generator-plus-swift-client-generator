import { CodegenArraySchema, CodegenHeader, CodegenLogLevel, CodegenOperation, CodegenOperationGroup, CodegenResponse, CodegenSchema, CodegenSchemaType } from '@openapi-generator-plus/types'
import { className, identifier, stringLiteral, ts } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { apiType, indentLines, values } from './helpers'

/**
 * One header that a response struct carries: its property, and the expression that reads it from
 * an `APIResponse` named `response`.
 */
interface ResponseHeaderMember {
	header: CodegenHeader
	/** The name of the property. */
	name: string
	/** The Swift type of the property, which is optional unless the API requires the header. */
	type: string
	/** An expression that reads the header, valid where an `APIResponse` named `response` is in scope. */
	reader: string
}

/**
 * A closure that reads text as the type of `schema`, or `null` when a header can't carry that type.
 *
 * Most types read their text with the initialiser of `LosslessStringConvertible`, which the generated
 * enums and date types have too.
 */
function headerParser(schema: CodegenSchema): string | null {
	const nativeType = schema.nativeType.concreteType
	switch (schema.schemaType) {
		case CodegenSchemaType.STRING:
			return nativeType === 'URL' ? '{ URL(string: $0) }' : '{ $0 }'
		case CodegenSchemaType.NUMBER:
			return nativeType === 'Decimal' ? '{ Decimal(string: $0) }' : `{ ${nativeType}($0) }`
		case CodegenSchemaType.INTEGER:
		case CodegenSchemaType.BOOLEAN:
		case CodegenSchemaType.DATE:
		case CodegenSchemaType.TIME:
		case CodegenSchemaType.DATETIME:
		case CodegenSchemaType.ENUM:
			return `{ ${nativeType}($0) }`
		default:
			return null
	}
}

/** The member for `header`, or `null` when the client can't read its type from a header. */
function headerMember(header: CodegenHeader, operation: CodegenOperation, ctx: SwiftContext): ResponseHeaderMember | null {
	const isList = header.schema.schemaType === CodegenSchemaType.ARRAY
	const parser = headerParser(isList ? (header.schema as CodegenArraySchema).component.schema : header.schema)
	if (parser === null) {
		ctx.generatorContext.log(CodegenLogLevel.WARN, `Cannot read the "${header.serializedName}" response header of operation "${operation.name}" as ${header.schema.nativeType}, so the client leaves it out`)
		return null
	}

	const method = `${header.required ? 'required' : ''}${header.required ? 'H' : 'h'}eader${isList ? 'List' : ''}`
	return {
		header,
		name: identifier(ctx.generatorContext.generator(), header.name),
		type: `${header.schema.nativeType.concreteType}${header.required ? '' : '?'}`,
		reader: `try response.${method}(${stringLiteral(ctx.generatorContext, header.serializedName)}) ${parser}`,
	}
}

/** The members for the headers that `response` declares and that the client can read. */
function headerMembers(response: CodegenResponse, operation: CodegenOperation, ctx: SwiftContext): ResponseHeaderMember[] {
	return values(response.headers)
		.map(header => headerMember(header, operation, ctx))
		.filter((member): member is ResponseHeaderMember => member !== null)
}

/** The name of the struct that carries `response`, inside its API struct: the operation's name and the status code, such as `GetUser200`. */
function responseStructName(operation: CodegenOperation, response: CodegenResponse, ctx: SwiftContext): string {
	return className(ctx.generatorContext.generator(), `${operation.name}_${String(response.code)}`)
}

/**
 * Whether `response` is carried by a struct of its own, because it declares headers that the client
 * reads. A response without one carries its body alone.
 */
export function hasResponseStruct(response: CodegenResponse, operation: CodegenOperation, ctx: SwiftContext): boolean {
	return headerMembers(response, operation, ctx).length > 0
}

/** The type that the result case of `response` carries, as it's referred to inside its API struct, or `null` when it carries nothing. */
export function resultCaseValueType(response: CodegenResponse, operation: CodegenOperation, ctx: SwiftContext): string | null {
	if (hasResponseStruct(response, operation, ctx)) {
		return responseStructName(operation, response, ctx)
	}
	return response.defaultContent?.nativeType ? `${response.defaultContent.nativeType}` : null
}

/**
 * The struct that carries `response`: its body, when it has content, and each header that the API
 * declares on it. Renders nothing when the response declares no headers that the client reads.
 */
export function responseStruct(response: CodegenResponse, operation: CodegenOperation, ctx: SwiftContext): string {
	const members = headerMembers(response, operation, ctx)
	if (members.length === 0) {
		return ''
	}

	const name = responseStructName(operation, response, ctx)
	const body = response.defaultContent?.nativeType ? `${response.defaultContent.nativeType}` : null
	const parameters = [
		...(body ? [`body: ${body}`] : []),
		...members.map(member => `${member.name}: ${member.type}${member.header.required ? '' : ' = nil'}`),
	].join(', ')

	/* Each property is a documentation comment, when there is one, and a declaration, with a blank line between properties */
	const properties = [
		...(body ? [`/// The body of the response.\npublic var body: ${body}`] : []),
		...members.map(member => `${member.header.description ? `/// ${indentLines(member.header.description, '/// ')}\n` : ''}public var ${member.name}: ${member.type}`),
	].join('\n\n')
	const assignments = [
		...(body ? ['self.body = body'] : []),
		...members.map(member => `self.${member.name} = ${member.name}`),
	].join('\n')

	return ts`
/**
 * The ${String(response.code)} response of \`${operation.name}\`: ${body ? 'its body, and ' : ''}the headers that the API declares on it.
 */
public struct ${name}: Swift.Sendable {
    ${properties}

    public init(${parameters}) {
        ${assignments}
    }
}`
}

/**
 * An expression that makes the struct of `response`, given the expression that holds its decoded
 * body. Valid where an `APIResponse` named `response` is in scope.
 */
export function responseStructValue(response: CodegenResponse, operation: CodegenOperation, group: CodegenOperationGroup, body: string | null, ctx: SwiftContext): string {
	const members = headerMembers(response, operation, ctx)
	const arguments_ = [
		...(body ? [`body: ${body}`] : []),
		...members.map(member => `${member.name}: ${member.reader}`),
	]
	return `${apiType(group)}.${responseStructName(operation, response, ctx)}(\n    ${arguments_.join(',\n    ')}\n)`
}
