import { CodegenOAuthFlow, CodegenSecurityScheme } from '@openapi-generator-plus/types'
import { identifier, stringLiteral, ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { SwiftContext } from '../types'

/**
 * A convenience factory for the flow client, using the endpoint URLs from the
 * API specification, or the empty string if the flow has no client we can
 * generate.
 */
function flowExtension(scheme: CodegenSecurityScheme, flow: CodegenOAuthFlow, tokenUrl: string, ctx: SwiftContext): string {
	const name = identifier(ctx.generatorContext.generator(), scheme.name)
	const token = flow.refreshUrl ? `, token: token, refreshURL: URL(string: "${flow.refreshUrl}")` : ''

	switch (flow.type) {
		case 'password':
			return ts`
extension OAuthPasswordFlowClient {
    /// Create an instance of \`OAuthPasswordFlowClient\` with provided authentication credentials, using endpoint URLs from the API specification.
    /// - Parameters:
    ///   - clientId: The client ID associated with the API.
    ///   - clientSecret: The client secret associated with the API.
    ///   - token: An optional \`OAuthAccessToken\` to initialize the client with. If not provided, the client will need to authenticate before making authorized requests.
    ///   - revocationURL: An optional URL for revoking the access token. If not provided, the client will not be able to revoke tokens.
    ///   - configuration: An optional \`OAuthConfiguration\` to customize the client's behavior. Defaults to a new instance of \`OAuthConfiguration\`.
    /// - Returns: An instance of \`OAuthPasswordFlowClient\` initialized with the provided parameters.
    public static func ${name}Client(clientId: String, clientSecret: String, token: OAuthAccessToken? = nil, revocationURL: URL? = nil, configuration: OAuthConfiguration = OAuthConfiguration()) -> OAuthPasswordFlowClient {
        OAuthPasswordFlowClient(clientId: clientId, clientSecret: clientSecret${token}, revocationURL: revocationURL, tokenURL: URL(string: "${tokenUrl}")!, configuration: configuration)
    }
}
`
		case 'clientCredentials':
			return ts`
extension OAuthClientCredentialsFlowClient {
    /// Create an instance of \`OAuthClientCredentialsFlowClient\` with provided authentication credentials, using endpoint URLs from the API specification.
    /// - Parameters:
    ///   - clientId: The client ID associated with the API.
    ///   - clientSecret: The client secret associated with the API.
    ///   - token: An optional \`OAuthAccessToken\` to initialize the client with.
    ///   - configuration: An optional \`OAuthConfiguration\` to customize the client's behavior. Defaults to a new instance of \`OAuthConfiguration\`.
    /// - Returns: An instance of \`OAuthClientCredentialsFlowClient\` initialized with the provided parameters.
    public static func ${name}Client(clientId: String, clientSecret: String, token: OAuthAccessToken? = nil, configuration: OAuthConfiguration = OAuthConfiguration()) -> OAuthClientCredentialsFlowClient {
        OAuthClientCredentialsFlowClient(clientId: clientId, clientSecret: clientSecret${token}, tokenURL: URL(string: "${tokenUrl}")!, configuration: configuration)
    }
}
`
		case 'authorizationCode': {
			const authorizationUrl = flow.authorizationUrl
			if (!authorizationUrl) {
				return ''
			}
			return ts`
extension OAuthAuthorizationCodeFlowClient {
    /// Create an instance of \`OAuthAuthorizationCodeFlowClient\` with provided authentication credentials, using endpoint URLs from the API specification.
    /// - Parameters:
    ///   - clientId: The client ID associated with the API.
    ///   - clientSecret: The client secret associated with the API.
    ///   - token: An optional \`OAuthAccessToken\` to initialize the client with.
    ///   - revocationURL: An optional URL for revoking the access token. If not provided, the client will not be able to revoke tokens.
    ///   - configuration: An optional \`OAuthConfiguration\` to customize the client's behavior. Defaults to a new instance of \`OAuthConfiguration\`.
    /// - Returns: An instance of \`OAuthAuthorizationCodeFlowClient\` initialized with the provided parameters.
    public static func ${name}Client(clientId: String, clientSecret: String, token: OAuthAccessToken?, revocationURL: URL? = nil, configuration: OAuthConfiguration = OAuthConfiguration()) -> OAuthAuthorizationCodeFlowClient {
        OAuthAuthorizationCodeFlowClient(clientId: clientId, clientSecret: clientSecret${token}, revocationURL: revocationURL, tokenURL: URL(string: "${tokenUrl}")!, authorizationURL: URL(string: "${authorizationUrl}")!, configuration: configuration)
    }
}
`
		}
		case 'implicit':
			return '// TODO: Generate the implicit flow client\n'
		default:
			return ''
	}
}

/** The enum of the security schemes declared by the API, and the OAuth flow client factories. */
export function securityScheme(securitySchemes: CodegenSecurityScheme[] | null, ctx: SwiftContext): string {
	const generator = ctx.generatorContext.generator()

	const cases = securitySchemes && securitySchemes.length
		? securitySchemes.map(scheme => `    case ${identifier(generator, scheme.name)} = ${stringLiteral(ctx.generatorContext, scheme.name)}`).join('\n')
		: ts`
    /// No security schemes were specified. This case is a placeholder so the enum is valid.
    case unspecified = "unspecified"`

	let extensions = ''
	for (const scheme of securitySchemes || []) {
		if (!scheme.isOAuth) {
			continue
		}
		for (const flow of scheme.flows || []) {
			/* Each flow is separated from the preceding declaration by a blank line. */
			extensions += '\n'
			if (flow.tokenUrl) {
				extensions += flowExtension(scheme, flow, flow.tokenUrl, ctx)
			}
		}
	}

	return ts`
//
//  The security schemes declared by the API specification.
//
//  ${generatedBy(ctx.root)}
//

import Foundation

/// The security schemes documented in the API specification.
public enum SecurityScheme: String, CustomDebugStringConvertible, Swift.Sendable {
${cases}

    public var debugDescription: String {
        return "SecurityScheme: \\(rawValue)"
    }
}
` + extensions
}
