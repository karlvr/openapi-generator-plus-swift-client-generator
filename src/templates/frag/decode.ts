import { CodegenProperty } from '@openapi-generator-plus/types'

/** Decode a property from its container, either keyed by coding key or from a single-value container. */
export function decode(property: CodegenProperty, keyed: boolean): string {
	const forKey = keyed ? `, forKey: .${property.name}` : ''
	if (property.required) {
		return `${property.name} = try container.decode(${property.nativeType}.self${forKey})`
	}
	const type = property.nullable ? `Nullable<${property.nativeType.concreteType}>` : property.nativeType.concreteType
	return `${property.name} = try container.decodeIfPresent(${type}.self${forKey})`
}
