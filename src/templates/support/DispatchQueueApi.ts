import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

export function dispatchQueueApi(root: RootContext): string {
	return ts`
//  
//  ${generatedBy(root)}
//

import Foundation

extension Swift.Optional where Wrapped == Dispatch.DispatchQueue {
    public func asyncIfPresent(group: Dispatch.DispatchGroup? = nil, qos: Dispatch.DispatchQoS = .unspecified, flags: Dispatch.DispatchWorkItemFlags = [], execute work: @Sendable @escaping @convention(block) () -> Void) {
        if let q = self {
            q.async(group: group, qos: qos, flags: flags, execute: work)
        } else {
            work()
        }
    }
}`
}
