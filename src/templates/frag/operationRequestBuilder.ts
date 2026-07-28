import { CodegenOperation, CodegenOperationGroup } from '@openapi-generator-plus/types'
import { maybe, ts, when } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { buildRequest } from './buildRequest'
import { operationDocumentation } from './operationDocumentation'
import { parseResponse, parseResponseName } from './parseResponse'
import { securityRequirementsDeclaration, securityRequirementsReference } from './securityRequirements'
import { parameterCount, paramsType, resultType, usesParametersStruct, values } from './helpers'

const DEPRECATED_FUNCTION = '@available(*, deprecated, message: "This function is deprecated. Please refer to the provider of the API specification for further instructions.")'

/**
 * Whether to generate a method that builds a request from only the operation's path parameters.
 *
 * There's no point when the operation's parameters _are_ its path parameters and it has no request
 * body, as the method would be identical to the one that takes all of the parameters. That's also
 * what keeps the two methods from being ambiguous: one takes the parameters struct as an unlabelled
 * argument, and the other takes labelled path parameters.
 */
function generatesPathOnlyRequest(operation: CodegenOperation): boolean {
	const request = operation.requestBody?.nativeType ? operation.requestBody : null
	return !!request || parameterCount(operation.pathParams) !== parameterCount(operation.parameters)
}

/** The statements that return the `APIRequest` for an operation, given the built `localVarRequest`. */
function returnRequest(operation: CodegenOperation, group: CodegenOperationGroup, ctx: SwiftContext): string {
	return ts`
return APIRequest<${resultType(operation, group, ctx)}>(
    urlRequest: localVarRequest,
    configuration: self.configuration,
    securityRequirements: ${securityRequirementsReference(operation)},
    parse: { [configuration] request, response in
        try Self.${parseResponseName(operation, ctx)}(configuration: configuration, request: request, response: response)
    }
)`
}

/**
 * The request builder's members for one operation: its security requirements, the methods that
 * build its request, and the function that parses its response.
 */
export function operationRequestBuilder(operation: CodegenOperation, group: CodegenOperationGroup, ctx: SwiftContext): string {
	const parameters = values(operation.parameters)
	const pathParams = values(operation.pathParams)
	const request = operation.requestBody?.nativeType ? operation.requestBody : null

	const requestBodyParameter = request ? `${request.name}: ${request.nativeType}` : ''

	/* The parameters of the method that takes all of the operation's parameters. Neither the
	   parameters nor the request body have default values, so that this method can't be called with
	   the same argument labels as the path parameters only method. */
	const allParameters = usesParametersStruct(operation)
		? [`_ __params: ${paramsType(operation, group, ctx)}`, ...(request ? [requestBodyParameter] : [])].join(', ')
		: [...parameters.map(parameter => `${parameter.name}: ${parameter.nativeType}`), ...(request ? [requestBodyParameter] : [])].join(', ')
	const allParametersValue = usesParametersStruct(operation) ? (name: string) => `__params.${name}` : (name: string) => name

	const pathParameters = pathParams.map(parameter => `${parameter.name}: ${parameter.nativeType}`).join(', ')

	return ts`
${maybe(securityRequirementsDeclaration(operation, ctx))}
${operationDocumentation(operation)}
${when(operation.deprecated, DEPRECATED_FUNCTION)}
public func ${operation.name}(${allParameters}) throws -> APIRequest<${resultType(operation, group, ctx)}> {
    ${buildRequest(operation, group, ctx, { pathOnly: false, value: allParametersValue })}

    ${returnRequest(operation, group, ctx)}
}

${when(generatesPathOnlyRequest(operation), () => ts`
/**
 * The request for the \`${operation.name}\` operation with only its path parameters applied, so
 * that it can be customised before it's sent.
 */
${when(operation.deprecated, DEPRECATED_FUNCTION)}
public func ${operation.name}(${pathParameters}) throws -> APIRequest<${resultType(operation, group, ctx)}> {
    ${buildRequest(operation, group, ctx, { pathOnly: true, value: name => name })}

    ${returnRequest(operation, group, ctx)}
}
`)}
${parseResponse(operation, group, ctx)}
`
}
