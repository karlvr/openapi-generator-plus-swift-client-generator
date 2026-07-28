import { CodegenOperation, CodegenOperationGroup } from '@openapi-generator-plus/types'
import { each, identifier, maybe, stringLiteral, ts, when } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { requestParameter } from './requestParameter'
import { requestBody } from './requestBody'
import { parameterCount, values } from './helpers'

export interface BuildRequestOptions {
	/**
	 * Only apply the path parameters, producing a request for the operation's URL that the caller
	 * can customise themselves.
	 */
	pathOnly: boolean
	/** The expression holding the value of a parameter, given the parameter's name. */
	value: (name: string) => string
}

/**
 * The statements that build the `URLRequest` for an operation, ending with `localVarRequest`
 * holding the request.
 *
 * The request is _not_ authorized and the configuration's `finalizeRequestBlock` is _not_ applied;
 * both of those happen when the request is sent, so that the caller may modify the request first.
 *
 * `localVarHeaderParameter.removeAll()` is emitted so that Swift doesn't complain that the variable
 * could be a `let` when no headers are added.
 */
export function buildRequest(operation: CodegenOperation, group: CodegenOperationGroup, ctx: SwiftContext, options: BuildRequestOptions): string {
	const generator = ctx.generatorContext.generator()
	const { pathOnly, value } = options
	const request = !pathOnly && operation.requestBody?.nativeType ? operation.requestBody : null

	/* The headers, cookies and body are only applied when we're applying all of the parameters.
	   Rendered separately so the block collapses to nothing when the operation has none of them. */
	const headersAndBody = pathOnly ? '' : ts`
${each(values(operation.headerParams), parameter => ts`
${requestParameter(parameter, { dest: 'localVarHeaderParameter', value: value(identifier(generator, parameter.name)), encoding: parameter.encoding }, ctx)}
`, '\n')}
${when(parameterCount(operation.cookieParams), () => ts`
var localVarCookieParams = [NameValuePair]()
${each(values(operation.cookieParams), parameter => ts`
${requestParameter(parameter, { dest: 'localVarCookieParams', value: value(identifier(generator, parameter.name)), encoding: parameter.encoding }, ctx)}
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
`

	return ts`
let localVarPath = "${group.path}${operation.path}"
    ${each(values(operation.pathParams), parameter => `.replacingOccurrences(of: "{${parameter.serializedName}}", with: String(${value(identifier(generator, parameter.name))}).addingPercentEncoding(withAllowedCharacters: .urlPathAllowed)!)`, '\n')}

var localVarHeaderParameter = [NameValuePair]()
localVarHeaderParameter.removeAll()

var localVarUrlComponents = URLComponents(string: "\\(self.basePath)\\(localVarPath)")!
var localVarQueryParameter = [NameValuePair]()
if let localVarExistingQueryItems = localVarUrlComponents.queryItems {
    localVarQueryParameter.append(queryItems: localVarExistingQueryItems)
}

${when(!pathOnly && parameterCount(operation.queryParams), () => ts`
${each(values(operation.queryParams), parameter => requestParameter(parameter, { dest: 'localVarQueryParameter', value: value(identifier(generator, parameter.name)), encoding: parameter.encoding }, ctx), '\n')}
`)}
localVarUrlComponents.queryItems = localVarQueryParameter.count > 0 ? localVarQueryParameter.toURLQueryItems() : nil

var localVarRequest = URLRequest(url: localVarUrlComponents.url!, cachePolicy: self.cachePolicy, timeoutInterval: self.timeoutInterval)
localVarRequest.httpMethod = ${stringLiteral(ctx.generatorContext, operation.httpMethod)}

${maybe(headersAndBody)}
localVarHeaderParameter.forEach { item in localVarRequest.addValue(item.value!, forHTTPHeaderField: item.name) }`
}
