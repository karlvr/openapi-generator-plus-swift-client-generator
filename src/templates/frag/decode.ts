import { CodegenProperty } from '@openapi-generator-plus/types'

/** Decode a property from its container, either keyed by coding key or from a single-value container. */
export function decode(property: CodegenProperty, keyed: boolean): string {
	const forKey = keyed ? `, forKey: .${property.name}` : ''
	if (property.required) {
		return `${property.name} = try container.decode(${property.nativeType}.self${forKey})`
	}
	const type = property.nullable ? `Nullable<${property.nativeType.concreteType}>` : property.nativeType.concreteType
	if (keyed && property.nullable) {
		/* decodeIfPresent gives nil for a null as well as for an absent key, so a present key is decoded as a Nullable */
		return `${property.name} = container.contains(.${property.name}) ? try container.decode(${type}.self${forKey}) : nil`
	}
	return `${property.name} = try container.decodeIfPresent(${type}.self${forKey})`
}
