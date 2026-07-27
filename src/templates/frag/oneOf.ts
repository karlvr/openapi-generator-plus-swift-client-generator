import { CodegenDiscriminator, CodegenHierarchySchema, CodegenOneOfSchema } from '@openapi-generator-plus/types'
import { camelCase, each, stringLiteral, ts, when } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { schemaDocumentation } from './schemaDocumentation'
import { nestedSchemas } from './nestedSchemas'

/** The `encode(to:)` body, which dispatches on the discriminator when there is one. */
function encodeBody(schema: CodegenOneOfSchema | CodegenHierarchySchema, discriminator: CodegenDiscriminator | null, ctx: SwiftContext): string {
	if (discriminator) {
		return ts`
var container = try encoder.container(keyedBy: CodingKeys.self)
switch self {
${each(discriminator.references, reference => ts`
case let .${camelCase(reference.schema.name)}(value):
    try container.encode(${stringLiteral(ctx.generatorContext, reference.value)}, forKey: .${discriminator.name})
    try value.encode(to: encoder)`, '\n')}
case let .unknown(discriminatorValue):
    throw EncoderError.cannotEncodeUnknown(discriminatorValue)
}`
	}
	return ts`
switch self {
${each(schema.composes, compose => ts`
case let .${camelCase(compose.name)}(value):
    try value.encode(to: encoder)`, '\n')}
case .unknown:
    throw EncoderError.cannotEncodeUnknown
}`
}

/** The `init(from:)` body: switch on the discriminator, or try each composed schema in turn. */
function decodeBody(schema: CodegenOneOfSchema | CodegenHierarchySchema, discriminator: CodegenDiscriminator | null, ctx: SwiftContext): string {
	if (discriminator) {
		return ts`
let container = try decoder.container(keyedBy: CodingKeys.self)
let discriminator = try container.decode(String.self, forKey: .${discriminator.name})
switch discriminator {
    ${each(discriminator.references, reference => ts`
case ${stringLiteral(ctx.generatorContext, reference.value)}:
    self = .${camelCase(reference.schema.name)}(try ${reference.schema.nativeType.concreteType}(from: decoder))`, '\n')}
    default:
        self = .unknown(discriminator)
}`
	}
	return ts`
${each(schema.composes, compose => ts`
do {
    self = .${camelCase(compose.name)}(try ${compose.nativeType.concreteType}(from: decoder))
    return
} catch {}`, '\n')}
self = .unknown`
}

/**
 * The body of a Swift enum for a oneOf or hierarchy schema: one case per
 * composed schema, plus an `unknown` case for values we can't map.
 */
export function oneOfContents(schema: CodegenOneOfSchema | CodegenHierarchySchema, ctx: SwiftContext): string {
	const discriminator = schema.discriminator

	return ts`
${schemaDocumentation(schema)}
public enum ${schema.name}: Swift.Codable, Swift.Hashable, Swift.Sendable {
    ${each(schema.composes, compose => `case ${camelCase(compose.name)}(_ value: ${compose.nativeType})`, '\n')}
    ${discriminator ? 'case unknown(_ discriminatorValue: String)' : 'case unknown'}

    enum EncoderError: Error {
        ${discriminator ? 'case cannotEncodeUnknown(_ discriminatorValue: String)' : 'case cannotEncodeUnknown'}
    }

    public func encode(to encoder: Swift.Encoder) throws {
        ${encodeBody(schema, discriminator, ctx)}
    }

    ${when(discriminator, () => ts`
enum CodingKeys: String, Swift.CodingKey, Swift.CaseIterable {
    case ${discriminator!.name}${discriminator!.name === discriminator!.serializedName ? '' : ` = ${stringLiteral(ctx.generatorContext, discriminator!.serializedName)}`}
}
`)}
    public init(from decoder: Swift.Decoder) throws {
        ${decodeBody(schema, discriminator, ctx)}
    }

    ${nestedSchemas(schema, ctx)}
}`
}
