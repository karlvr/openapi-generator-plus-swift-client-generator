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
}`
}
