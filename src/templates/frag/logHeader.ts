import { ts } from '@openapi-generator-plus/template-utils'
import { RootContext } from '../types'

/** The `OSLog` import and logger declaration for a generated source file. */
export function logHeader(category: string, root: RootContext): string {
	return ts`
import OSLog

private let logger = Logger(subsystem: "${root.logging.subsystem}", category: "${category}")`
}
