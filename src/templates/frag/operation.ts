import { CodegenOperation, CodegenOperationGroup, CodegenResponse } from '@openapi-generator-plus/types'
import { className, each, maybe, ts, when } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { operationDocumentation } from './operationDocumentation'
import { parametersStruct } from './parametersStruct'
import { indentLines, resultTypeName, usesParametersStruct, values } from './helpers'

const DEPRECATED_FUNCTION = '@available(*, deprecated, message: "This function is deprecated. Please refer to the provider of the API specification for further instructions.")'

/** The `case` of the operation's result enum for a response. */
function resultCase(response: CodegenResponse): string {
	return ts`
${maybe(response.description, description => ts`
/**
 * ${indentLines(description, ' * ')}
 */`)}
case _${String(response.code)}${response.defaultContent?.nativeType ? `(_ value: ${response.defaultContent.nativeType})` : ''}`
}

/**
 * All of the API methods for one operation: its result enum, the convenience overloads taking a
 * request struct, and the completion-handler and async forms.
 *
 * Each of them builds its request with the operation group's request builder and executes it.
 */
export function operation(operation: CodegenOperation, group: CodegenOperationGroup, ctx: SwiftContext): string {
	const generator = ctx.generatorContext.generator()
	const parameters = values(operation.parameters)
	const request = operation.requestBody?.nativeType ? operation.requestBody : null
	const responses = values(operation.responses)

	const params = [
		...parameters.map(parameter => `${parameter.name}: ${parameter.nativeType}${parameter.required ? '' : ' = nil'}`),
		...(request ? [`${request.name}: ${request.nativeType}${request.required ? '' : ' = nil'}`] : []),
	].join(', ')
	const callParams = [
		...parameters.map(parameter => `${parameter.name}: ${parameter.name}`),
		...(request ? [`${request.name}: ${request.name}`] : []),
	].join(', ')
	const requestCallParams = [
		...parameters.map(parameter => `${parameter.name}: __request.${parameter.name}`),
		...(request ? [`${request.name}: ${request.name}`] : []),
	].join(', ')

	const resultType = resultTypeName(operation, ctx)
	const requestableType = className(generator, `${group.name}_${operation.name}_requestable`)
	const requestBodyParameter = request ? `${request.name}: ${request.nativeType}${request.required ? '' : ' = nil'}` : ''

	/* The arguments to the request builder's method, which takes the parameters as a struct when
	   there's more than one of them. */
	const builderParams = usesParametersStruct(operation)
		? [
			`${className(generator, `${operation.name}_request`)}(${parameters.map(parameter => `${parameter.name}: ${parameter.name}`).join(', ')})`,
			...(request ? [`${request.name}: ${request.name}`] : []),
		].join(', ')
		: callParams
	const builderRequestParams = [
		'__request',
		...(request ? [`${request.name}: ${request.name}`] : []),
	].join(', ')

	return ts`
public enum ${resultType}: Swift.Sendable {
    ${each(responses, response => when(response.code !== 401, () => resultCase(response)), '\n')}
}

${when(usesParametersStruct(operation), () => ts`
${parametersStruct(operation, group, ctx)}

${operationDocumentation(operation)}
${when(operation.deprecated, DEPRECATED_FUNCTION)}
public func ${operation.name}(_ __request: ${requestableType}, ${request ? `${requestBodyParameter}, ` : ''}responseQueue: DispatchQueue? = nil, completion: @escaping (@Sendable (_ result: Swift.Result<${resultType}, Error>) -> Void)) {
    ${operation.name}(${requestCallParams}, responseQueue: responseQueue, completion: completion)
}

${operationDocumentation(operation)}
${when(operation.deprecated, DEPRECATED_FUNCTION)}
public func ${operation.name}(_ __request: ${requestableType}${request ? `, ${requestBodyParameter}` : ''}) async throws -> ${resultType} {
    return try await requestBuilder.${operation.name}(${builderRequestParams}).execute()
}
`)}
${operationDocumentation(operation)}
${when(operation.deprecated, DEPRECATED_FUNCTION)}
public func ${operation.name}(${params}${params ? ', ' : ''}responseQueue: DispatchQueue? = nil, completion: @escaping (@Sendable (_ result: Swift.Result<${resultType}, Error>) -> Void)) {
    let responseQueue = responseQueue ?? requestBuilder.configuration.responseQueue
    Task {
        do {
            let result = try await ${operation.name}(${callParams})
            responseQueue.asyncIfPresent {
                completion(.success(result))
            }
        } catch {
            responseQueue.asyncIfPresent {
                completion(.failure(error))
            }
        }
    }
}

${operationDocumentation(operation)}
${when(operation.deprecated, DEPRECATED_FUNCTION)}
public func ${operation.name}(${params}) async throws -> ${resultType} {
    return try await requestBuilder.${operation.name}(${builderParams}).execute()
}
`
}
