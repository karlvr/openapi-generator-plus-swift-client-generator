import { CodegenAuthScope, CodegenOperation } from '@openapi-generator-plus/types'
import { each, identifier, stringLiteral, ts } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'

/** The scopes array literal for a security scheme. */
function scopesLiteral(scopes: CodegenAuthScope[] | null, ctx: SwiftContext): string {
	return `[${(scopes || []).map(scope => stringLiteral(ctx.generatorContext, scope.name)).join(', ')}]`
}

/** The name of the constant holding an operation's security requirements. */
export function securityRequirementsName(operation: CodegenOperation): string {
	return `${operation.name}SecurityRequirements`
}

/**
 * The declaration of the constant holding an operation's security requirements, or the empty
 * string when the operation has no security requirements.
 */
export function securityRequirementsDeclaration(operation: CodegenOperation, ctx: SwiftContext): string {
	const requirements = operation.securityRequirements
	if (!requirements) {
		return ''
	}
	const generator = ctx.generatorContext.generator()

	return ts`
/** The security requirements of the \`${operation.name}\` operation. */
private static let ${securityRequirementsName(operation)} = SecurityRequirements(
    requirements: [
        ${each(requirements.requirements, requirement => ts`
SecurityRequirements.Requirement(schemes: [
    ${each(requirement.schemes, scheme => `SecurityRequirements.Scheme(securityScheme: .${identifier(generator, scheme.scheme.name)}, scopes: ${scopesLiteral(scheme.scopes, ctx)}),`, '\n')}
]),`, '\n')}
    ],
    optional: ${requirements.optional ? 'true' : 'false'}
)
`
}

/** The expression for an operation's security requirements, which is `nil` when it has none. */
export function securityRequirementsReference(operation: CodegenOperation): string {
	if (!operation.securityRequirements) {
		return 'nil'
	}
	return `Self.${securityRequirementsName(operation)}`
}
