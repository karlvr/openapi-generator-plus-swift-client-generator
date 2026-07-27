import { CodegenOperation, CodegenOperationGroup, CodegenResponse } from '@openapi-generator-plus/types'
import { className, each, identifier, maybe, stringLiteral, ts, when } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { operationDocumentation } from './operationDocumentation'
import { parametersStruct } from './parametersStruct'
import { requestParameter } from './requestParameter'
import { requestBody } from './requestBody'
import { requestSecurity, scopesLiteral } from './requestSecurity'
import { log } from './log'
import { indentLines, parameterCount, values } from './helpers'

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

/** The `case` of the response switch that decodes and returns a response. */
function responseCase(response: CodegenResponse): string {
	return ts`
case ${String(response.code)}:
    ${log({ level: 'debug', msg: `\\(__request) Received ${String(response.code)} response` })}
    ${responseResult(response)}`
}

/** The statements that turn a decoded response into the operation's result. */
function responseResult(response: CodegenResponse): string {
	const content = response.defaultContent
	if (!content?.nativeType) {
		return `return ._${String(response.code)}`
	}
	return ts`
do {
    let decodedData = try JSONDecoder().decode(${content.nativeType.concreteType}.self, from: result.data)
    return ._${String(response.code)}(decodedData)
} catch {
    throw APIError.invalidResponse(error, response: result.response, data: result.data)
}`
}

/** The `case 401:` branch that reauthenticates and retries the request. */
function unauthorizedCase(operation: CodegenOperation, callParams: string, ctx: SwiftContext): string {
	const securityRequirements = operation.securityRequirements
	if (!securityRequirements) {
		return ''
	}
	const generator = ctx.generatorContext.generator()

	return ts`
case 401:
    if allowsReauth, let securityClient = configuration.securityClient {
        ${log({ level: 'debug', msg: '\\(__request) Received 401 response, attempting to reauthenticate' })}
        var didAuthenticate = false
        var lastError: Error?
        ${each(securityRequirements.requirements, requirement => ts`
if !didAuthenticate {
    do {
        ${each(requirement.schemes, scheme => `try await securityClient.reauthenticate(failedRequest: __request, securityScheme: .${identifier(generator, scheme.scheme.name)}, scopes: ${scopesLiteral(scheme.scopes, ctx)})`, '\n')}
        didAuthenticate = true
    } catch (let error) {
        lastError = error
    }
}`, '\n')}
        ${when(!securityRequirements.optional, () => ts`
if !didAuthenticate {
    throw lastError!
}`)}
        return try await ${operation.name}(${callParams}${callParams ? ', ' : ''}allowsReauth: false)
    } else {
        ${log({ level: 'debug', msg: '\\(__request) Received 401 response, throwing APIError.authenticationFailed' })}
        throw APIError.authenticationFailed(result.response, data: result.data)
    }`
}

/**
 * All of the API methods for one operation: its result enum, the convenience
 * overloads taking a request struct, the completion-handler and async forms,
 * and the method that builds the `URLRequest`.
 *
 * `localVarHeaderParameter.removeAll()` is emitted so that Swift doesn't
 * complain that the variable could be a `let` when no headers are added.
 */
export function operation(operation: CodegenOperation, group: CodegenOperationGroup, ctx: SwiftContext): string {
	const generator = ctx.generatorContext.generator()
	const parameters = values(operation.parameters)
	const request = operation.requestBody?.nativeType ? operation.requestBody : null
	const responses = values(operation.responses)
	const catchAllResponse = operation.catchAllResponse

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

	const resultType = `${className(generator, operation.name)}Result`
	const requestableType = className(generator, `${group.name}_${operation.name}_requestable`)
	const requestBodyParameter = request ? `${request.name}: ${request.nativeType}${request.required ? '' : ' = nil'}` : ''

	return ts`
public enum ${resultType}: Swift.Sendable {
    ${each(responses, response => when(response.code !== 401, () => resultCase(response)), '\n')}
}

${when(parameterCount(operation.parameters) > 1, () => ts`
${parametersStruct(operation, group, ctx)}

${operationDocumentation(operation)}
${when(operation.deprecated, DEPRECATED_FUNCTION)}
public func ${operation.name}(_ __request: ${requestableType}, ${request ? `${requestBodyParameter}, ` : ''}responseQueue: DispatchQueue? = nil, completion: @escaping (@Sendable (_ result: Swift.Result<${resultType}, Error>) -> Void)) {
    ${operation.name}(${requestCallParams}, responseQueue: responseQueue, completion: completion)
}

${operationDocumentation(operation)}
${when(operation.deprecated, DEPRECATED_FUNCTION)}
public func ${operation.name}(_ __request: ${requestableType}${request ? `, ${requestBodyParameter}` : ''}) async throws -> ${resultType} {
    return try await ${operation.name}(${requestCallParams})
}
`)}
${operationDocumentation(operation)}
${when(operation.deprecated, DEPRECATED_FUNCTION)}
public func ${operation.name}(${params}${params ? ', ' : ''}responseQueue: DispatchQueue? = nil, completion: @escaping (@Sendable (_ result: Swift.Result<${resultType}, Error>) -> Void)) {
    let responseQueue = responseQueue ?? configuration.responseQueue
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
    do {
        return try await ${operation.name}(${callParams}${params ? ', ' : ''}allowsReauth: true)
    } catch let error as APIError {
        configuration.onError?(error)
        throw error
    }
}

private func ${operation.name}(${params}${params ? ', ' : ''}allowsReauth: Bool) async throws -> ${resultType} {
    let __request = try await ${operation.name}Request(${callParams})
    let result = try await URLSession.handleApiRequest(__request, retryConfiguration: configuration.retryConfiguration)
    switch result.response.statusCode {
    ${maybe(unauthorizedCase(operation, callParams, ctx))}
    ${each(responses, response => when(response.code !== 401 && !response.isCatchAll, () => responseCase(response)), '\n')}
    default:
        ${log({ level: 'debug', msg: '\\(__request) Received unexpected response \\(result.response.statusCode)' })}
        ${catchAllResponse ? responseResult(catchAllResponse) : 'throw APIError.unexpectedResponse(result.response, data: result.data)'}
    }
}

${operationDocumentation(operation)}
public func ${operation.name}Request(${params}) async throws -> URLRequest {
    let localVarPath = "${group.path}${operation.path}"
        ${each(values(operation.pathParams), parameter => `.replacingOccurrences(of: "{${parameter.serializedName}}", with: String(${identifier(generator, parameter.name)}).addingPercentEncoding(withAllowedCharacters: .urlPathAllowed)!)`, '\n')}

    var localVarHeaderParameter = [NameValuePair]()
    localVarHeaderParameter.removeAll()

    var localVarUrlComponents = URLComponents(string: "\\(self.basePath)\\(localVarPath)")!
    var localVarQueryParameter = [NameValuePair]()
    if let localVarExistingQueryItems = localVarUrlComponents.queryItems {
        localVarQueryParameter.append(queryItems: localVarExistingQueryItems)
    }

    ${when(parameterCount(operation.queryParams), () => ts`
${each(values(operation.queryParams), parameter => requestParameter(parameter, { dest: 'localVarQueryParameter', value: identifier(generator, parameter.name), encoding: parameter.encoding }, ctx), '\n')}
`)}
    localVarUrlComponents.queryItems = localVarQueryParameter.count > 0 ? localVarQueryParameter.toURLQueryItems() : nil

    var localVarRequest = URLRequest(url: localVarUrlComponents.url!, cachePolicy: self.cachePolicy, timeoutInterval: self.timeoutInterval)
    localVarRequest.httpMethod = ${stringLiteral(ctx.generatorContext, operation.httpMethod)}
    ${log({ level: 'debug', msg: 'Requesting \\(localVarRequest)' })}

    ${each(values(operation.headerParams), parameter => ts`
${requestParameter(parameter, { dest: 'localVarHeaderParameter', value: identifier(generator, parameter.name), encoding: parameter.encoding }, ctx)}
`, '\n')}
    ${when(parameterCount(operation.cookieParams), () => ts`
var localVarCookieParams = [NameValuePair]()
${each(values(operation.cookieParams), parameter => ts`
${requestParameter(parameter, { dest: 'localVarCookieParams', value: identifier(generator, parameter.name), encoding: parameter.encoding }, ctx)}
`, '\n')}
localVarHeaderParameter.set("Cookie", localVarCookieParams.toString(separator: "; "))
`)}
    ${when(request, () => request!.required ? ts`
${requestBody(request!, ctx)}
` : ts`
if let ${request!.name} = ${request!.name} {
    ${requestBody(request!, ctx)}
}
`)}
    localVarHeaderParameter.forEach { item in localVarRequest.addValue(item.value!, forHTTPHeaderField: item.name) }

    ${requestSecurity(operation, ctx)}

    if let localVarFinalizeRequestBlock = self.configuration.finalizeRequestBlock {
        localVarFinalizeRequestBlock(&localVarRequest)
    }
    return localVarRequest
}
`
}
