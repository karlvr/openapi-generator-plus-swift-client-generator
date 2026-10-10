import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

export function nameValuePair(root: RootContext): string {
	return ts`
//  
//  ${generatedBy(root)}
//

import Foundation

struct NameValuePair: Swift.Sendable {
    var name: Swift.String
    var value: Swift.String?

    /// The pair as a query item whose name and value are percent encoded, for \`URLComponents.percentEncodedQueryItems\`.
    func toPercentEncodedURLQueryItem() -> Foundation.URLQueryItem {
        return Foundation.URLQueryItem(name: name.addingPercentEncoding(withAllowedCharacters: .urlUnreserved)!, value: value?.addingPercentEncoding(withAllowedCharacters: .urlUnreserved))
    }
}

extension Swift.Array where Element == NameValuePair {

    mutating func append(queryItems: [Foundation.URLQueryItem]) {
        self.append(contentsOf: queryItems.map { NameValuePair(name: $0.name, value: $0.value) })
    }

    mutating func set(_ name: Swift.String, _ value: Swift.String?) {
        self.removeAll { $0.name == name }
        self.append(NameValuePair(name: name, value: value))
    }

    /// The pairs as query items whose names and values are percent encoded, for \`URLComponents.percentEncodedQueryItems\`.
    ///
    /// \`URLComponents.queryItems\` leaves a "+" unencoded, and a server reads that as a space, so the client
    /// encodes each pair itself.
    func toPercentEncodedURLQueryItems() -> [Foundation.URLQueryItem] {
        return self.map { $0.toPercentEncodedURLQueryItem() }
    }

    func toString(separator: Swift.String) -> Swift.String {
        return self.map { "\\($0.name.addingPercentEncoding(withAllowedCharacters: .urlUnreserved)!)=\\($0.value?.addingPercentEncoding(withAllowedCharacters: .urlUnreserved) ?? "")" }.joined(separator: separator)
    }

}
`
}
