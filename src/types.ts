import { JavaLikeOptions } from '@openapi-generator-plus/java-like-generator-helper'

/**
 * Options specific to the template that the user can provide to the code generation process.
 */
export interface CodegenOptionsSwift extends JavaLikeOptions {
	relativeSourceOutputPath: string
	customTemplatesPath: string | null
	hideGenerationTimestamp: boolean
	/** Additional HTTP response status codes that will trigger an automatic retry. 429 Too Many Requests is always automatically retried. */
	additionalRetryStatusCodes: string[]
	package: {
		name: string
	}
}
