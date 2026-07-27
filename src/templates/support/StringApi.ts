import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

export function stringApi(root: RootContext): string {
	return ts`
//  
//  ${generatedBy(root)}
//

import Foundation

extension Swift.String {
    init(_ decimal: Foundation.Decimal) {
        self.init("\\(decimal)")
    }

    init(_ url: Foundation.URL) {
        self.init(url.absoluteString)
    }
}
`
}
