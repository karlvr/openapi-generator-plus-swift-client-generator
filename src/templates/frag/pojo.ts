import { CodegenObjectSchema, CodegenProperty } from '@openapi-generator-plus/types'
import { each, stringLiteral, ts, undefinedValueLiteral, when } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { schemaDocumentation } from './schemaDocumentation'
import { propertyDocumentation } from './propertyDocumentation'
import { nestedSchemas } from './nestedSchemas'
import { decode } from './decode'
import { encode } from './encode'
import { values } from './helpers'

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
function codingKey(property: CodegenProperty, ctx: SwiftContext): string {
	if (property.name === property.serializedName) {
		return `        case ${property.name}`
	}
	return `        case ${property.name} = ${stringLiteral(ctx.generatorContext, property.serializedName)}`
}

/** The body of a Swift struct for an object schema. */
export function pojoContents(schema: CodegenObjectSchema, ctx: SwiftContext): string {
	const properties = values(schema.properties)

	return ts`
${schemaDocumentation(schema)}
${when(schema.deprecated, DEPRECATED_OBJECT)}
public struct ${schema.name}: ${structConformances(schema)} {
${each(properties, property => ts`

    ${propertyDocumentation(property)}
    ${when(property.deprecated, DEPRECATED_PROPERTY)}
    public var ${property.name}: ${property.nativeType}`, '\n')}

    public init(${properties.map(property => initParameter(property, ctx)).join(', ')}) {
${each(properties, property => `        self.${property.name} = ${property.name}`, '\n')}
    }

${when(properties.length, () => ts`
    enum CodingKeys: String, Swift.CodingKey, Swift.CaseIterable {
${each(properties, property => when(!property.discriminators, () => codingKey(property, ctx)), '\n')}
    }

    // Encodable protocol methods

    public init(from decoder: Swift.Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
${each(properties, property => `        ${decode(property, true)}`, '\n')}
    }

    public func encode(to encoder: Swift.Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
${each(properties, property => `        ${encode(property, true)}`, '\n')}
    }
`)}
    ${nestedSchemas(schema, ctx)}
}`
}
