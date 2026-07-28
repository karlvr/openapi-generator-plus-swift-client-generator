import { CodegenOperation } from '@openapi-generator-plus/types'
import { each, ts, undefinedValueLiteral } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { propertyDocumentation } from './propertyDocumentation'
import { paramsTypeName, values } from './helpers'

/** The struct holding an operation's parameters. */
export function parametersStruct(operation: CodegenOperation, ctx: SwiftContext): string {
	const parameters = values(operation.parameters)
	const initParameters = parameters
		.map(parameter => parameter.required
			? `${parameter.name}: ${parameter.nativeType}`
			: `${parameter.name}: ${parameter.nativeType} = ${undefinedValueLiteral(ctx.generatorContext, parameter.schema)}`)
		.join(', ')

	return ts`
public struct ${paramsTypeName(operation, ctx)}: Swift.Equatable, Swift.Hashable, Swift.Sendable {
    ${each(parameters, parameter => ts`
${propertyDocumentation(parameter)}
public var ${parameter.name}: ${parameter.nativeType}`, '\n')}

    public init(${initParameters}) {
        ${each(parameters, parameter => `self.${parameter.name} = ${parameter.name}`, '\n')}
    }
}`
}
