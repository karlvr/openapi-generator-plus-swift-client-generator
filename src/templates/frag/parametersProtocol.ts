import { CodegenOperation, CodegenOperationGroup } from '@openapi-generator-plus/types'
import { className, each, ts } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { propertyDocumentation } from './propertyDocumentation'
import { values } from './helpers'

/** The protocol describing the parameters an operation accepts. */
export function parametersProtocol(operation: CodegenOperation, group: CodegenOperationGroup, ctx: SwiftContext): string {
	const generator = ctx.generatorContext.generator()

	return ts`
public protocol ${group.name}${className(generator, `${operation.name}_requestable`)}: Swift.Sendable {
    ${each(values(operation.parameters), parameter => ts`
${propertyDocumentation(parameter)}
var ${parameter.name}: ${parameter.nativeType} { get set }`, '\n')}
}`
}
