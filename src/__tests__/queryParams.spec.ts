import { testGenerate } from '@openapi-generator-plus/generator-common/dist/testing'
import fs from 'fs'
import path from 'path'
import { build, prepare } from './common'

/** Recursively find the first generated file whose name ends with `suffix`. */
function findFileEndingWith(dir: string, suffix: string): string | undefined {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const entryPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			const found = findFileEndingWith(entryPath, suffix)
			if (found) {
				return found
			}
		} else if (entry.name.endsWith(suffix)) {
			return entryPath
		}
	}
	return undefined
}

describe('query params map helpers', () => {
	let base: string
	let api: string
	let widgetsApi: string
	let apiError: string

	beforeAll(async() => {
		const result = await prepare('fixtures/query-params.yml', { package: { name: 'TestModule' } })
		await testGenerate(result, {
			testName: 'query-params',
			postProcess: async(basePath) => {
				base = basePath
			},
		})
		api = fs.readFileSync(findFileEndingWith(base, 'ThingsApi.swift')!, 'utf8')
		widgetsApi = fs.readFileSync(findFileEndingWith(base, 'WidgetsApi.swift')!, 'utf8')
		apiError = fs.readFileSync(findFileEndingWith(base, 'APIError.swift')!, 'utf8')
	})

	test('the per-operation parameters struct keeps its Request name', () => {
		expect(api).toContain('public struct SearchThingsRequest: ThingsSearchThingsRequestable')
	})

	test('APIError gains a missing-required-query-parameter case', () => {
		expect(apiError).toContain('case missingRequiredQueryParameter(name: Swift.String)')
	})

	test('toQueryMap serializes only query params, keyed by their API names', () => {
		expect(api).toContain('public func toQueryMap() -> [Swift.String: [Swift.String]] {')
		/* Required scalar. */
		expect(api).toContain('result["q", default: []].append(String(self.q))')
		/* Optional scalar guarded by `if let`. */
		expect(api).toContain('if let note = self.note {')
		expect(api).toContain('result["note", default: []].append(String(note))')
		/* Array: one entry per element. */
		expect(api).toContain('self.tags?.forEach { result["tags", default: []].append(String($0)) }')
		expect(api).toContain('self.statuses?.forEach { result["statuses", default: []].append(String($0)) }')
		/* Path, header and object-typed query params must NOT appear in the map. */
		expect(api).not.toContain('result["id"')
		expect(api).not.toContain('result["X-Trace"')
		expect(api).not.toContain('result["filter"')
	})

	test('withQuery overrides query params from the map, parsing to their types', () => {
		expect(api).toContain('public func withQuery(_ query: [Swift.String: [Swift.String]]) -> Self {')
		expect(api).toContain('var copy = self')
		/* String: taken verbatim. */
		expect(api).toContain('copy.q = query["q"]?.first ?? self.q')
		expect(api).toContain('copy.tags = query["tags"] ?? self.tags')
		/* Failable scalar: flatMap into the concrete type. */
		expect(api).toContain('copy.limit = query["limit"]?.first.flatMap({ Int($0) }) ?? self.limit')
		expect(api).toContain('copy.offset = query["offset"]?.first.flatMap({ Int64($0) }) ?? self.offset')
		expect(api).toContain('copy.day = query["day"]?.first.flatMap({ LocalDate($0) }) ?? self.day')
		/* Enum: total init via map. */
		expect(api).toContain('copy.status = query["status"]?.first.map({ TestModule.Status($0) }) ?? self.status')
		/* Failable array element: compactMap drops malformed. */
		expect(api).toContain('copy.ids = query["ids"]?.compactMap({ Int($0) }) ?? self.ids')
		/* Enum array element: total map. */
		expect(api).toContain('copy.statuses = query["statuses"]?.map({ TestModule.Status($0) }) ?? self.statuses')
		/* Path, header and object-typed query params are not overridden. */
		expect(api).not.toContain('copy.id =')
		expect(api).not.toContain('copy.xTrace =')
		expect(api).not.toContain('copy.filter =')
	})

	test('a throwing init takes the non-query args (incl. object query params) plus a query map', () => {
		/* The object-typed query param `filter` is an explicit argument, not read from the map. */
		expect(api).toContain('public init(id: String, xTrace: String? = nil, filter: TestModule.Filter? = nil, query: [Swift.String: [Swift.String]]) throws {')
		/* Non-query args are assigned straight through. */
		expect(api).toContain('self.id = id')
		expect(api).toContain('self.filter = filter')
		expect(api).not.toContain('query["filter"')
		expect(api).not.toContain('query["id"')
		expect(api).not.toContain('query["X-Trace"')
	})

	test('required query params throw when absent/unparseable, optional ones fall back to nil', () => {
		expect(api).toContain('guard let q = query["q"]?.first else {')
		expect(api).toContain('guard let limit = query["limit"]?.first.flatMap({ Int($0) }) else {')
		expect(api).toContain('throw APIError.missingRequiredQueryParameter(name: "q")')
		expect(api).toContain('throw APIError.missingRequiredQueryParameter(name: "limit")')
		/* Optional query params are read without a guard. */
		expect(api).toContain('self.note = query["note"]?.first')
		expect(api).toContain('self.tags = query["tags"]')
	})

	test('the map init is marked throws only when a required query param can throw', () => {
		/* searchThings has required query params, so its map init throws. */
		expect(api).toContain('query: [Swift.String: [Swift.String]]) throws {')
		/* listWidgets has only optional query params, so its map init does not throw. */
		expect(widgetsApi).toContain('public init(id: String, query: [Swift.String: [Swift.String]]) {')
		expect(widgetsApi).not.toContain('query: [Swift.String: [Swift.String]]) throws {')
		expect(widgetsApi).not.toContain('missingRequiredQueryParameter')
	})

	test('the generated client compiles', async() => {
		await build(base)
	}, 300000)
})
