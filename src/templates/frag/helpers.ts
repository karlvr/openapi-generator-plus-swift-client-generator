import { CodegenOperation, CodegenOperationGroup, CodegenParameters } from '@openapi-generator-plus/types'
import { className } from '@openapi-generator-plus/template-utils'
import * as idx from '@openapi-generator-plus/indexed-type'
import { SwiftContext } from '../types'

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

/**
 * Whether an operation takes its parameters as a struct rather than as individual arguments.
 *
 * We only create a struct when there's more than one parameter, as the order of parameters is
 * irrelevant but may change as the API specification evolves.
 */
export function usesParametersStruct(operation: CodegenOperation): boolean {
	return parameterCount(operation.parameters) > 1
}

/** The name of the API struct for an operation group. */
export function apiType(group: CodegenOperationGroup): string {
	return `${group.name}Api`
}

/** The name of the request builder struct for an operation group's API struct. */
export function requestBuilderType(group: CodegenOperationGroup): string {
	return `${apiType(group)}RequestBuilder`
}

/** The name of the enum holding an operation's result, as it's referred to inside its API struct. */
export function resultTypeName(operation: CodegenOperation, ctx: SwiftContext): string {
	return `${className(ctx.generatorContext.generator(), operation.name)}Result`
}

/** The name of the enum holding an operation's result, qualified by the API struct it's nested in. */
export function resultType(operation: CodegenOperation, group: CodegenOperationGroup, ctx: SwiftContext): string {
	return `${apiType(group)}.${resultTypeName(operation, ctx)}`
}
