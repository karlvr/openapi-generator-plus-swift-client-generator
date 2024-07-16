import { JavaLikeOptions } from '@openapi-generator-plus/java-like-generator-helper'

/**
 * Options specific to the template that the user can provide to the code generation process.
 */
export interface CodegenOptionsSwift extends JavaLikeOptions {
	relativeSourceOutputPath: string
	customTemplatesPath: string | null
	hideGenerationTimestamp: boolean
	customRetryStatusCodes: string[]
	package: {
		name: string
	}
}
