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

    /// The content of the file.
    public var data: Data
    /// The name of the file, which a multipart part declares when there is one.
    public var filename: String?

    public init(data: Data, filename: String? = nil) {
        self.data = data
        self.filename = filename
    }
}
`
}
