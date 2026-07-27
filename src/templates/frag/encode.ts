import { CodegenProperty } from '@openapi-generator-plus/types'

/** Encode a property into its container, either keyed by coding key or into a single-value container. */
export function encode(property: CodegenProperty, keyed: boolean): string {
	const forKey = keyed ? `, forKey: .${property.name}` : ''
	const method = property.required ? 'encode' : 'encodeIfPresent'
	return `try container.${method}(${property.name}${forKey})`
}
