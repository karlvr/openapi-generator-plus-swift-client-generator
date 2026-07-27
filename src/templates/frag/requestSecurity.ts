import { CodegenAuthScope, CodegenOperation } from '@openapi-generator-plus/types'
import { SKIP, Skip, each, identifier, stringLiteral, ts, when } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'

/** The scopes array literal for an authorization call. */
export function scopesLiteral(scopes: CodegenAuthScope[] | null, ctx: SwiftContext): string {
	return `[${(scopes || []).map(scope => stringLiteral(ctx.generatorContext, scope.name)).join(', ')}]`
}

/**
 * The statements that authorize a request, trying each security requirement in
 * turn, or SKIP when the operation has no security requirements.
 */
export function requestSecurity(operation: CodegenOperation, ctx: SwiftContext): string | Skip {
	const securityRequirements = operation.securityRequirements
	if (!securityRequirements) {
		return SKIP
	}
	const generator = ctx.generatorContext.generator()

	return ts`
var didAuthenticate = false
var lastError: Error?

${each(securityRequirements.requirements, requirement => ts`
if !didAuthenticate {
    var authedRequest = localVarRequest
    do {
${each(requirement.schemes, scheme => {
		const name = identifier(generator, scheme.scheme.name)
		const scopes = scopesLiteral(scheme.scopes, ctx)
		return ts`
        if let securityClient = self.configuration.securityClient {
            do {
                try await securityClient.authorize(request: &authedRequest, securityScheme: .${name}, scopes: ${scopes})
            } catch APIError.notAuthenticated {
                try await securityClient.reauthenticate(failedRequest: authedRequest, securityScheme: .${name}, scopes: ${scopes})
                try await securityClient.authorize(request: &authedRequest, securityScheme: .${name}, scopes: ${scopes})
            }
        }`
	}, '\n')}
        didAuthenticate = true
        localVarRequest = authedRequest
    } catch (let error) {
        lastError = error
    }
}`, '\n')}
${when(!securityRequirements.optional, () => ts`
if !didAuthenticate {
    throw lastError!
}`)}`
}
