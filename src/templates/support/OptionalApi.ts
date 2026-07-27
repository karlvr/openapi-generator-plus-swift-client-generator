import { ts } from '@openapi-generator-plus/template-utils'
import { generatedBy } from '../frag/generatedBy'
import { RootContext } from '../types'

export function optionalApi(root: RootContext): string {
	return ts`
//  
//  ${generatedBy(root)}
//

extension Optional {

    /// Return nil if the value is undefined or explicitly set to \`null\`
    public func orNil<T>() -> T? where Wrapped == Nullable<T> {
        return self?.value
    }

    /// Return a default value if the value is undefined or explicitly set to \`null\`
    public func or<T>(_ defaultValue: T) -> T where Wrapped == Nullable<T> {
        return self?.value ?? defaultValue
    }

}`
}
