import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

export function characterSetApi(root: RootContext): string {
	return ts`
//  
//  ${generatedBy(root)}
//

import Foundation

extension Foundation.CharacterSet {

    /// The character set for percent encoding x-www-form-urlencoded data.
    static let formUrlEncoded: Foundation.CharacterSet = {
        var set = Foundation.CharacterSet.alphanumerics
        return set
    }()

    /// The characters that RFC 3986 calls unreserved, which a query or a form value carries without encoding.
    ///
    /// Use it to encode a value for a query or a form body. Every other character, such as a "+" that a
    /// server reads as a space, or the separator of a joined value, is percent encoded.
    static let urlUnreserved = Foundation.CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
}`
}
