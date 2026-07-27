import { CodegenOperation, CodegenOperationGroup } from '@openapi-generator-plus/types'
import { className, each, ts, undefinedValueLiteral } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { propertyDocumentation } from './propertyDocumentation'
import { values } from './helpers'

/** A concrete struct implementing an operation's parameters protocol. */
export function parametersStruct(operation: CodegenOperation, group: CodegenOperationGroup, ctx: SwiftContext): string {
	const generator = ctx.generatorContext.generator()
	const parameters = values(operation.parameters)
	const initParameters = parameters
		.map(parameter => parameter.required
			? `${parameter.name}: ${parameter.nativeType}`
			: `${parameter.name}: ${parameter.nativeType} = ${undefinedValueLiteral(ctx.generatorContext, parameter.schema)}`)
		.join(', ')

	return ts`
public struct ${className(generator, `${operation.name}_request`)}: ${className(generator, `${group.name}_${operation.name}_requestable`)}, Swift.Equatable, Swift.Hashable, Swift.Sendable {
${each(parameters, parameter => ts`
    ${propertyDocumentation(parameter)}
    public var ${parameter.name}: ${parameter.nativeType}`, '\n')}

    public init(${initParameters}) {
${each(parameters, parameter => `        self.${parameter.name} = ${parameter.name}`, '\n')}
    }
}`
}
