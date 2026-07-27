import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

export function jsonNull(root: RootContext): string {
	return ts`
//
//  ${generatedBy(root)}
//

import Foundation

/**
 * The JSON Schema \`null\` type: a value that can only ever be \`null\`.
 *
 * Decoding fails if the value isn't \`null\`, and the only value that can be constructed encodes as \`null\`.
 */
public struct JSONNull: Swift.Codable, Swift.Hashable, Swift.Sendable {

    public init() {}

    public init(from decoder: Swift.Decoder) throws {
        let container = try decoder.singleValueContainer()
        guard container.decodeNil() else {
            throw Swift.DecodingError.typeMismatch(JSONNull.self, Swift.DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Expected null"))
        }
    }

    public func encode(to encoder: Swift.Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encodeNil()
    }

}
`
}
