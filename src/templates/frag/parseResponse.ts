import { CodegenOperation, CodegenOperationGroup, CodegenResponse } from '@openapi-generator-plus/types'
import { className, each, stringLiteral, ts, when } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { log } from './log'
import { resultType, values } from './helpers'
import { hasResponseStruct, responseStructValue } from './responseStruct'

/** The statements that turn a decoded response into the operation's result. */
function responseResult(response: CodegenResponse, operation: CodegenOperation, group: CodegenOperationGroup, ctx: SwiftContext): string {
	const content = response.defaultContent
	if (hasResponseStruct(response, operation, ctx)) {
		/* The headers are read after the body is decoded, so that a header the client can't read isn't reported as a body it can't decode */
		if (!content?.nativeType) {
			return `return ._${String(response.code)}(${responseStructValue(response, operation, group, null, ctx)})`
		}
		return ts`
try response.checkContentType(${stringLiteral(ctx.generatorContext, content.mediaType.mediaType)})
let decodedData: ${content.nativeType.concreteType}
do {
    decodedData = try JSONDecoder().decode(${content.nativeType.concreteType}.self, from: response.data)
} catch {
    throw APIError.invalidResponse(error, response: response.response, data: response.data)
}
return ._${String(response.code)}(${responseStructValue(response, operation, group, 'decodedData', ctx)})`
	}
	if (!content?.nativeType) {
		return `return ._${String(response.code)}`
	}
	return ts`
try response.checkContentType(${stringLiteral(ctx.generatorContext, content.mediaType.mediaType)})
do {
    let decodedData = try JSONDecoder().decode(${content.nativeType.concreteType}.self, from: response.data)
    return ._${String(response.code)}(decodedData)
} catch {
    throw APIError.invalidResponse(error, response: response.response, data: response.data)
}`
}

/** The `case` of the response switch that decodes and returns a response. */
function responseCase(response: CodegenResponse, operation: CodegenOperation, group: CodegenOperationGroup, ctx: SwiftContext): string {
	return ts`
case ${String(response.code)}:
    ${log({ level: 'debug', msg: `\\(request) Received ${String(response.code)} response` })}
    ${responseResult(response, operation, group, ctx)}`
}

/** The name of the function that parses an operation's response. */
export function parseResponseName(operation: CodegenOperation, ctx: SwiftContext): string {
	return `parse${className(ctx.generatorContext.generator(), operation.name)}Response`
}

/**
 * The function that parses an operation's response into its result.
 *
 * A 401 response is never parsed: it's either recovered from by reauthenticating, or reported as
 * `APIError.authenticationFailed`, both of which happen when the request is sent.
 */
export function parseResponse(operation: CodegenOperation, group: CodegenOperationGroup, ctx: SwiftContext): string {
	const responses = values(operation.responses)
	const catchAllResponse = operation.catchAllResponse

	return ts`
/** Parse the response of the \`${operation.name}\` operation. */
private static func ${parseResponseName(operation, ctx)}(configuration: Configuration, request: URLRequest, response: APIResponse) throws -> ${resultType(operation, group, ctx)} {
    switch response.response.statusCode {
    ${each(responses, response => when(response.code !== 401 && !response.isCatchAll, () => responseCase(response, operation, group, ctx)), '\n')}
    default:
        ${log({ level: 'debug', msg: '\\(request) Received unexpected response \\(response.response.statusCode)' })}
        ${catchAllResponse ? responseResult(catchAllResponse, operation, group, ctx) : 'throw APIError.unexpectedResponse(response.response, data: response.data)'}
    }
}`
}
