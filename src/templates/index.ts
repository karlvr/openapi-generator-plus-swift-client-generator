import { CodegenSecurityScheme } from '@openapi-generator-plus/types'
import { SwiftContext } from './types'

import { apiError } from './support/APIError'
import { characterSetApi } from './support/CharacterSetApi'
import { configuration } from './support/Configuration'
import { dispatchQueueApi } from './support/DispatchQueueApi'
import { file } from './support/File'
import { formData } from './support/FormData'
import { jsonValue } from './support/JSONValue'
import { localDate } from './support/LocalDate'
import { localTime } from './support/LocalTime'
import { nameValuePair } from './support/NameValuePair'
import { nsTextCheckingResultApi } from './support/NSTextCheckingResultApi'
import { nullable } from './support/Nullable'
import { oauthConfiguration } from './support/OAuthConfiguration'
import { offsetDateTime } from './support/OffsetDateTime'
import { optionalApi } from './support/OptionalApi'
import { retryConfiguration } from './support/RetryConfiguration'
import { stringApi } from './support/StringApi'
import { timeZoneApi } from './support/TimeZoneApi'
import { urlSessionApi } from './support/URLSessionApi'

import { abstractOAuthFlowClient } from './security/AbstractOAuthFlowClient'
import { apiKeySecurityClient } from './security/APIKeySecurityClient'
import { basicAuthenticationSecurityClient } from './security/BasicAuthenticationSecurityClient'
import { oauthAccessToken } from './security/OAuthAccessToken'
import { oauthAccessTokenManager } from './security/OAuthAccessTokenManager'
import { oauthAuthorizationCodeFlowClient } from './security/OAuthAuthorizationCodeFlowClient'
import { oauthClientCredentialsFlowClient } from './security/OAuthClientCredentialsFlowClient'
import { oauthPasswordFlowClient } from './security/OAuthPasswordFlowClient'
import { securityClient } from './security/SecurityClient'
import { securityClientController } from './security/SecurityClientController'
import { securityScheme } from './security/SecurityScheme'

export { RootContext, SwiftContext } from './types'
export { api } from './api'
export { packageSwift } from './Package'
export { pojo } from './pojo'
export { enumTemplate } from './enum'
export { interfaceTemplate } from './interface'
export { oneOf } from './oneOf'
export { wrapper } from './wrapper'
export { generatedBy } from './frag/generatedBy'

/** The support source files, keyed by the file name they're written to. */
export const supportTemplates: Record<string, (ctx: SwiftContext) => string> = {
	'APIError.swift': ctx => apiError(ctx.root),
	'CharacterSet+Api.swift': ctx => characterSetApi(ctx.root),
	'Configuration.swift': ctx => configuration(ctx.root),
	'DispatchQueue+Api.swift': ctx => dispatchQueueApi(ctx.root),
	'File.swift': ctx => file(ctx.root),
	'FormData.swift': ctx => formData(ctx.root),
	'JSONValue.swift': ctx => jsonValue(ctx.root),
	'LocalDate.swift': ctx => localDate(ctx.root),
	'LocalTime.swift': ctx => localTime(ctx.root),
	'NSTextCheckingResult+Api.swift': ctx => nsTextCheckingResultApi(ctx.root),
	'NameValuePair.swift': ctx => nameValuePair(ctx.root),
	'Nullable.swift': ctx => nullable(ctx.root),
	'OAuthConfiguration.swift': ctx => oauthConfiguration(ctx.root),
	'OffsetDateTime.swift': ctx => offsetDateTime(ctx.root),
	'Optional+Api.swift': ctx => optionalApi(ctx.root),
	'RetryConfiguration.swift': ctx => retryConfiguration(ctx.root),
	'String+Api.swift': ctx => stringApi(ctx.root),
	'TimeZone+Api.swift': ctx => timeZoneApi(ctx.root),
	'URLSession+Api.swift': ctx => urlSessionApi(ctx.root),
}

/** The security source files, keyed by the file name they're written to. */
export const securityTemplates: Record<string, (ctx: SwiftContext, securitySchemes: CodegenSecurityScheme[] | null) => string> = {
	'APIKeySecurityClient.swift': ctx => apiKeySecurityClient(ctx.root),
	'AbstractOAuthFlowClient.swift': ctx => abstractOAuthFlowClient(ctx.root),
	'BasicAuthenticationSecurityClient.swift': ctx => basicAuthenticationSecurityClient(ctx.root),
	'OAuthAccessToken.swift': ctx => oauthAccessToken(ctx.root),
	'OAuthAccessTokenManager.swift': ctx => oauthAccessTokenManager(ctx.root),
	'OAuthAuthorizationCodeFlowClient.swift': ctx => oauthAuthorizationCodeFlowClient(ctx.root),
	'OAuthClientCredentialsFlowClient.swift': ctx => oauthClientCredentialsFlowClient(ctx.root),
	'OAuthPasswordFlowClient.swift': ctx => oauthPasswordFlowClient(ctx.root),
	'SecurityClient.swift': ctx => securityClient(ctx.root),
	'SecurityClientController.swift': ctx => securityClientController(ctx.root),
	'SecurityScheme.swift': (ctx, securitySchemes) => securityScheme(securitySchemes, ctx),
}
