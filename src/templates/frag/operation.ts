import { CodegenOperation, CodegenResponse } from '@openapi-generator-plus/types'
import { each, maybe, ts, when } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { operationDocumentation } from './operationDocumentation'
import { parametersStruct } from './parametersStruct'
import { indentLines, paramsTypeName, resultTypeName, usesParametersStruct, values } from './helpers'

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
 * parameters struct, and the completion-handler and async forms.
 *
 * Each of them builds its request with the operation group's request builder and executes it.
 */
export function operation(operation: CodegenOperation, ctx: SwiftContext): string {
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
	const paramsCallParams = [
		...parameters.map(parameter => `${parameter.name}: __params.${parameter.name}`),
		...(request ? [`${request.name}: ${request.name}`] : []),
	].join(', ')

	const resultType = resultTypeName(operation, ctx)
	const paramsType = paramsTypeName(operation, ctx)
	const requestBodyParameter = request ? `${request.name}: ${request.nativeType}${request.required ? '' : ' = nil'}` : ''

	/* The arguments to the request builder's method, which takes the parameters as a struct when
	   there's more than one of them. */
	const builderParams = usesParametersStruct(operation)
		? [
			`${paramsType}(${parameters.map(parameter => `${parameter.name}: ${parameter.name}`).join(', ')})`,
			...(request ? [`${request.name}: ${request.name}`] : []),
		].join(', ')
		: callParams
	const builderParamsParams = [
		'__params',
		...(request ? [`${request.name}: ${request.name}`] : []),
	].join(', ')

	return ts`
public enum ${resultType}: Swift.Sendable {
    ${each(responses, response => when(response.code !== 401, () => resultCase(response)), '\n')}
}

${when(usesParametersStruct(operation), () => ts`
${parametersStruct(operation, ctx)}

${operationDocumentation(operation)}
${when(operation.deprecated, DEPRECATED_FUNCTION)}
public func ${operation.name}(_ __params: ${paramsType}, ${request ? `${requestBodyParameter}, ` : ''}responseQueue: DispatchQueue? = nil, completion: @escaping (@Sendable (_ result: Swift.Result<${resultType}, Error>) -> Void)) {
    ${operation.name}(${paramsCallParams}, responseQueue: responseQueue, completion: completion)
}

${operationDocumentation(operation)}
${when(operation.deprecated, DEPRECATED_FUNCTION)}
public func ${operation.name}(_ __params: ${paramsType}${request ? `, ${requestBodyParameter}` : ''}) async throws -> ${resultType} {
    return try await requestBuilder.${operation.name}(${builderParamsParams}).execute()
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
