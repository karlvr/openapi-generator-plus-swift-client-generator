import { CodegenInterfaceSchema } from '@openapi-generator-plus/types'
import { each, ts } from '@openapi-generator-plus/template-utils'
import { SwiftContext } from '../types'
import { schemaDocumentation } from './schemaDocumentation'
import { propertyDocumentation } from './propertyDocumentation'
import { nestedSchemas } from './nestedSchemas'
import { values } from './helpers'

/**
 * The body of a Swift protocol for an interface schema.
 *
 * A property that holds a discriminator value is read-only, as a member that conforms fixes it to
 * its own value.
 */
export function interfaceContents(schema: CodegenInterfaceSchema, ctx: SwiftContext): string {
	return ts`
${schemaDocumentation(schema)}
public protocol ${schema.name} {
    ${each(values(schema.properties), property => ts`
${propertyDocumentation(property)}
var ${property.name}: ${property.nativeType} { ${property.readOnly || property.discriminators ? 'get' : 'get set'} }`, '\n')}

    ${nestedSchemas(schema, ctx)}
}`
}
