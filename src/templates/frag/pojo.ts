import { CodegenObjectSchema, CodegenProperty } from '@openapi-generator-plus/types'
import { each, stringLiteral, ts, undefinedValueLiteral, when } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { schemaDocumentation } from './schemaDocumentation'
import { propertyDocumentation } from './propertyDocumentation'
import { nestedSchemas } from './nestedSchemas'
import { decode } from './decode'
import { encode } from './encode'
import { values } from './helpers'
import { NarrowedDiscriminatorProperty, narrowedDiscriminatorProperties } from './discriminator'

const DEPRECATED_OBJECT = '@available(*, deprecated, message: "This object is deprecated. Please refer to the provider of the API specification for further instructions.")'
const DEPRECATED_PROPERTY = '@available(*, deprecated, message: "This property is deprecated. Please refer to the provider of the API specification for further instructions.")'

/** The protocols a struct conforms to: the standard set plus any interfaces it implements. */
export function structConformances(schema: { implements: { nativeType: { parentType: string } }[] | null }): string {
	return [
		'Swift.Codable',
		'Swift.Hashable',
		'Swift.Sendable',
		...(schema.implements || []).map(implemented => implemented.nativeType.parentType),
	].join(', ')
}

/** The declaration of an initialiser parameter for a property, including its default value if it's optional. */
export function initParameter(property: CodegenProperty, ctx: SwiftContext): string {
	if (property.required) {
		return `${property.name}: ${property.nativeType}`
	}
	const defaultValue = property.initialValue ? property.initialValue.literalValue : undefinedValueLiteral(ctx.generatorContext, property.schema)
	return `${property.name}: ${property.nativeType} = ${defaultValue}`
}

/** The coding key case for a property, quoting the serialized name when it differs from the Swift name. */
function codingKey(property: Pick<CodegenProperty, 'name' | 'serializedName'>, ctx: SwiftContext): string {
	if (property.name === property.serializedName) {
		return `case ${property.name}`
	}
	return `case ${property.name} = ${stringLiteral(ctx.generatorContext, property.serializedName)}`
}

/** A discriminator property that the struct fixes to its own value, as a computed property. */
function narrowedProperty(narrowed: NarrowedDiscriminatorProperty): string {
	return ts`
${narrowed.property ? propertyDocumentation(narrowed.property) : ''}
/// The discriminator value that identifies this type. It's fixed, so it always agrees with the type.
${when(narrowed.property?.deprecated, DEPRECATED_PROPERTY)}
public var ${narrowed.name}: ${narrowed.nativeType} { ${narrowed.literalValue} }`
}

/**
 * The body of a Swift struct for an object schema.
 *
 * A discriminator property that the struct fixes to its own value is a computed property, so it's
 * left out of the initialiser and ignored when decoding, but always written when encoding. Every
 * other property, including a discriminator property that the schema declares for its members to
 * fix, is stored and coded normally.
 */
export function pojoContents(schema: CodegenObjectSchema, ctx: SwiftContext): string {
	const narrowed = narrowedDiscriminatorProperties(schema)
	const properties = values(schema.properties).filter(property => !narrowed.some(candidate => candidate.serializedName === property.serializedName))
	const codingKeys = [...narrowed, ...properties]

	return ts`
${schemaDocumentation(schema)}
${when(schema.deprecated, DEPRECATED_OBJECT)}
public struct ${schema.name}: ${structConformances(schema)} {
    ${each(properties, property => ts`

${propertyDocumentation(property)}
${when(property.deprecated, DEPRECATED_PROPERTY)}
public var ${property.name}: ${property.nativeType}`, '\n')}
    ${each(narrowed, narrowedProperty, '\n')}

    public init(${properties.map(property => initParameter(property, ctx)).join(', ')}) {
        ${each(properties, property => `self.${property.name} = ${property.name}`, '\n')}
    }

    ${when(codingKeys.length, () => ts`
enum CodingKeys: String, Swift.CodingKey, Swift.CaseIterable {
    ${each(codingKeys, property => codingKey(property, ctx), '\n')}
}

// Encodable protocol methods

public init(from decoder: Swift.Decoder) throws {
    ${when(properties.length, () => ts`
let container = try decoder.container(keyedBy: CodingKeys.self)
${each(properties, property => decode(property, true), '\n')}`)}
}

public func encode(to encoder: Swift.Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    ${each(narrowed, property => `try container.encode(${property.name}, forKey: .${property.name})`, '\n')}
    ${each(properties, property => encode(property, true), '\n')}
}
`)}
    ${nestedSchemas(schema, ctx)}
}`
}
