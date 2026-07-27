import { CodegenParameters } from '@openapi-generator-plus/types'
import * as idx from '@openapi-generator-plus/indexed-type'

/**
 * Indent every line of `value` after the first by `indent`, including empty
 * lines and any empty final line.
 *
 * This is the whitespace behaviour needed for a value spliced into the middle
 * of a line: the first line continues the line it's on and the rest line up
 * under it. The empty final line is indented too, so that whatever follows the
 * value starts at the right column.
 */
export function indentLines(value: string, indent: string): string {
	return value.split(/\r?\n/).join(`\n${indent}`)
}

/** The number of parameters in an indexed parameter collection. */
export function parameterCount(parameters: CodegenParameters | null): number {
	return parameters ? idx.size(parameters) : 0
}

/** The values of an indexed collection, or an empty array if it's absent. */
export function values<T>(collection: idx.IndexedType<string, T> | null | undefined): T[] {
	return collection ? idx.allValues(collection) : []
}
