import { CodegenGeneratorContext } from '@openapi-generator-plus/types'
import { CodegenOptionsSwift } from '../types'

/**
 * The root context shared by every template: the generator's options plus the
 * fields that {@link commonGenerator}'s `templateRootContext` contributes.
 */
export interface RootContext extends CodegenOptionsSwift {
	generatedDate: string
	clientGenerator: boolean
	serverGenerator: boolean
	documentationGenerator: boolean
	generatorClass: string

	/* Allow a child generator's own root-context fields. */
	[key: string]: unknown
}

/**
 * Bundles the pieces a template function needs to render: the generator
 * context (for `generator()`, native types and so on) and the root options
 * context.
 */
export interface SwiftContext {
	generatorContext: CodegenGeneratorContext
	root: RootContext
}
