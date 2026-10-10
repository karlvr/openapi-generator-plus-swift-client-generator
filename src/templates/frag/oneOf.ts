import { CodegenDiscriminator, CodegenHierarchySchema, CodegenOneOfSchema, CodegenSchemaType } from '@openapi-generator-plus/types'
import { camelCase, each, stringLiteral, ts, when } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { schemaDocumentation } from './schemaDocumentation'
import { nestedSchemas } from './nestedSchemas'
import { narrowsDiscriminator } from './discriminator'

/**
 * The `encode(to:)` body, which dispatches on the discriminator when there is one.
 *
 * A member that fixes the discriminator property to its own value writes the property itself, so
 * the enum writes it only for a member that doesn't. It writes it after the member, so that its
 * value replaces any value that the member holds.
 */
function encodeBody(schema: CodegenOneOfSchema | CodegenHierarchySchema, discriminator: CodegenDiscriminator | null, ctx: SwiftContext): string {
	if (discriminator) {
		const writesDiscriminator = discriminator.references.filter(reference => !narrowsDiscriminator(reference.schema, discriminator))
		return ts`
${when(writesDiscriminator.length, 'var container = encoder.container(keyedBy: CodingKeys.self)')}
switch self {
${each(discriminator.references, reference => ts`
case let .${camelCase(reference.schema.name)}(value):
    try value.encode(to: encoder)
    ${when(writesDiscriminator.includes(reference), `try container.encode(${wireLiteral(discriminator, reference.value, ctx)}, forKey: .${discriminator.name})`)}`, '\n')}
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

/**
 * The Swift type that a discriminator value has on the wire.
 *
 * Members may each declare their own enum for the property, so an enum discriminator is read as the
 * string it's sent as, rather than as any one member's enum.
 */
function wireType(discriminator: CodegenDiscriminator): string {
	return discriminator.schema.schemaType === CodegenSchemaType.BOOLEAN ? 'Bool' : 'String'
}

/** A discriminator value as a Swift literal of its wire type. */
function wireLiteral(discriminator: CodegenDiscriminator, value: string, ctx: SwiftContext): string {
	return wireType(discriminator) === 'Bool' ? value : stringLiteral(ctx.generatorContext, value)
}

/**
 * Whether the discriminator's references cover every value of its wire type, so that a switch over
 * them needs no default case. Only a boolean discriminator can be covered.
 */
function coversEveryValue(discriminator: CodegenDiscriminator): boolean {
	if (wireType(discriminator) !== 'Bool') {
		return false
	}
	const values = discriminator.references.map(reference => reference.value)
	return values.includes('true') && values.includes('false')
}

/**
 * The `init(from:)` body: switch on the discriminator, or try each composed schema in turn.
 *
 * The discriminator is read with the type it has on the wire, so a boolean discriminator is matched
 * as a boolean rather than as a string.
 */
function decodeBody(schema: CodegenOneOfSchema | CodegenHierarchySchema, discriminator: CodegenDiscriminator | null, ctx: SwiftContext): string {
	if (discriminator) {
		return ts`
let container = try decoder.container(keyedBy: CodingKeys.self)
let discriminator = try container.decode(${wireType(discriminator)}.self, forKey: .${discriminator.name})
switch discriminator {
    ${each(discriminator.references, reference => ts`
case ${wireLiteral(discriminator, reference.value, ctx)}:
    self = .${camelCase(reference.schema.name)}(try ${reference.schema.nativeType.concreteType}(from: decoder))`, '\n')}
    ${when(!coversEveryValue(discriminator), ts`
default:
    self = .unknown("\\(discriminator)")`)}
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
