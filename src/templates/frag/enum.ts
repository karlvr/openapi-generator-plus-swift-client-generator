import { CodegenEnumSchema } from '@openapi-generator-plus/types'
import { each, ts } from '@openapi-generator-plus/template-utils'
import { schemaDocumentation } from './schemaDocumentation'
import { values } from './helpers'

/** The body of a Swift enum for an enum schema. */
export function enumContents(schema: CodegenEnumSchema): string {
	const enumValues = values(schema.enumValues)
	const name = schema.name ?? ''

	return ts`
${schemaDocumentation(schema)}
public enum ${name} : Swift.Codable, Swift.Hashable, Swift.CaseIterable, Swift.Equatable, Swift.LosslessStringConvertible, Swift.Sendable {
    case unknown(value: String)
${each(enumValues, value => `    case ${value.name}`, '\n')}

    public init(_ rawValue: String) {
        switch rawValue {
${each(enumValues, value => `        case ${value.literalValue}: self = .${value.name}`, '\n')}
        default: self = .unknown(value: rawValue)
        }
    }

    public var value: String {
        switch self {
        case let .unknown(value): return value
${each(enumValues, value => `        case .${value.name}: return ${value.literalValue}`, '\n')}
        }
    }

    public init(from decoder: Swift.Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawString = try container.decode(String.self)
        self = .init(rawString)
    }

    public func encode(to encoder: Swift.Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(value)
    }

    public var description: String { return value }

    public static var allCases: [${name}] {
        return [${enumValues.map(value => `.${value.name}`).join(', ')}]
    }
}`
}
