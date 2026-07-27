import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

export function file(root: RootContext): string {
	return ts`
//  
//  ${generatedBy(root)}
//

import Foundation

/// A file that can be sent to an API, such as as part of FormData
public struct File: Swift.Codable, Swift.Hashable, Swift.Sendable {

    var data: Data
    var filename: String?
    
}
`
}
