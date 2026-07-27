import { CodegenWrapperSchema } from '@openapi-generator-plus/types'
import { ts } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { schemaDocumentation } from './schemaDocumentation'
import { propertyDocumentation } from './propertyDocumentation'
import { nestedSchemas } from './nestedSchemas'
import { decode } from './decode'
import { encode } from './encode'
import { structConformances } from './pojo'

/** The body of a Swift struct for a wrapper schema: a single value encoded transparently. */
export function wrapperContents(schema: CodegenWrapperSchema, ctx: SwiftContext): string {
	const property = schema.property

	const initialValue = property.initialValue ? property.initialValue.literalValue : 'nil'
	const initParameter = property.required
		? `${property.name}: ${property.nativeType}`
		: `${property.name}: ${property.nativeType} = ${initialValue}`

	return ts`
${schemaDocumentation(schema)}
public struct ${schema.name}: ${structConformances(schema)} {
    ${propertyDocumentation(property)}
    public var ${property.name}: ${property.nativeType}

    public init(${initParameter}) {
        self.${property.name} = ${property.name}
    }

    // Encodable protocol methods

    public init(from decoder: Swift.Decoder) throws {
        let container = try decoder.singleValueContainer()
        ${decode(property, false)}
    }

    public func encode(to encoder: Swift.Encoder) throws {
        var container = encoder.singleValueContainer()
        ${encode(property, false)}
    }

    ${nestedSchemas(schema, ctx)}
}`
}
