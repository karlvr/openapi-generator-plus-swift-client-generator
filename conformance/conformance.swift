/*
 * The conformance driver for the swift-client generator.
 *
 * The suite copies this file into the generated package, so the package's own
 * compiler checks it against the generated types. A signature change that a
 * caller cannot write then fails the build.
 *
 * The driver only makes calls. It reports what each call produced, and the suite
 * asserts on that, and on what a recording server received.
 *
 * Run it as: swift run ConformanceDriver <baseUrl> <resultsPath>
 */

import Foundation
import TestModule

let WHEN = OffsetDateTime("2020-01-02T03:04:05.678Z")!
let DAY = LocalDate("2020-01-02")!
let PATH_SEGMENT = "a b/c?d#e&f+g%h:i@j"
let QUERY_VALUE = "a b+c&d=e%f#g"
let TEXT_BODY = "plain \"text\" body"
let BINARY_BODY = "binary content"
let API_KEY_HEADER = "header-key"
let API_KEY_QUERY = "query-key"
let BEARER_TOKEN = "bearer-token"
let BASIC_USERNAME = "basic-user"
let BASIC_PASSWORD = "basic-secret"

func anObject() -> QueryObject {
    QueryObject(name: "x", count: 1, when: WHEN)
}

/**
 * A second object, so a case that sends more than one object can tell them apart.
 * The driver passes its arguments by position, so two equal objects would hide a
 * call that passes them in the wrong order.
 */
func anotherObject() -> QueryObject {
    QueryObject(name: "y", count: 2, when: WHEN)
}

/// A joined style writes every property into one value, so it needs values that no style has to encode.
func aPlainObject() -> QueryObject {
    QueryObject(name: "x", count: 1)
}

/**
 * How the driver reports one property of a response model: "absent" when the
 * model carries no value, "null" when it carries a null, and the value as text
 * otherwise.
 *
 * A model holds a null and an absent property differently in each language, and
 * neither survives a plain serialisation. So the driver names the state itself.
 */
func state<T>(_ value: Nullable<T>?) -> String {
    switch value {
    case .none:
        return "absent"
    case .some(.null):
        return "null"
    case let .some(.some(value)):
        return String(describing: value)
    }
}

/// The state of every property of a nullable response model.
func statesOf(_ model: JsonBody) -> [String: String] {
    [
        "name": model.name,
        "nullableName": state(model.nullableName),
        "nullableCount": state(model.nullableCount),
        "nullableWhen": state(model.nullableWhen),
        "nullableChild": state(model.nullableChild),
        "nullableList": state(model.nullableList),
    ]
}

/**
 * How the driver reports a response header: its value as text, or "absent" where the response
 * carried none.
 */
func headerState<T>(_ value: T?) -> String {
    value.map { String(describing: $0) } ?? "absent"
}

/**
 * How the driver reports the headers of the list header case: each element of the list as text,
 * or "absent" where the response carried no list.
 */
struct HeaderListReport: Encodable {
    let name: String
    let ids: [String]?
    let count: String

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(name, forKey: .name)
        if let ids {
            try container.encode(ids, forKey: .ids)
        } else {
            try container.encode("absent", forKey: .ids)
        }
        try container.encode(count, forKey: .count)
    }

    enum CodingKeys: String, CodingKey {
        case name, ids, count
    }
}

/**
 * Sends a bearer token in the `Authorization` header.
 *
 * The client gives a caller a security client for an API key and for HTTP basic
 * authentication. A caller supplies any other scheme through `SecurityClient`.
 */
struct BearerSecurityClient: SecurityClient {
    let token: String

    func reauthenticate(failedRequest: URLRequest, securityScheme: SecurityScheme, scopes: [String]?) async throws {
    }

    func authorize(request: inout URLRequest, securityScheme: SecurityScheme, scopes: [String]?) async throws {
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
}

let harness = ConformanceHarness()

/*
 * The client asks for the credential of one scheme at a time, and names the
 * scheme. Each scheme has its own value, so a client that reads the credential
 * of another scheme shows it.
 */
let configuration = Configuration(
    basePath: harness.baseUrl,
    securityClient: SecurityClientController(clients: [
        .apiKeyHeader: APIKeySecurityClient(apiKey: API_KEY_HEADER, mode: .header, paramName: "X-Api-Key"),
        .apiKeyQuery: APIKeySecurityClient(apiKey: API_KEY_QUERY, mode: .query, paramName: "api_key"),
        .bearerAuth: BearerSecurityClient(token: BEARER_TOKEN),
        .basicAuth: BasicAuthenticationSecurityClient(username: BASIC_USERNAME, password: BASIC_PASSWORD),
    ])
)
let query = QueryApi(configuration: configuration)
let form = FormApi(configuration: configuration)
let multipart = MultipartApi(configuration: configuration)
let json = JsonApi(configuration: configuration)
let body = BodyApi(configuration: configuration)
let response = AResponseApi(configuration: configuration)
let security = SecurityApi(configuration: configuration)
let root = RootApi(configuration: configuration)

await harness.startCase("query-scalars-values")
await harness.call { try await query.queryScalars(str: "hello world", num: 42, dbl: 1.5, flag: false, when: WHEN, day: DAY) }

await harness.startCase("query-scalars-absent")
await harness.call { try await query.queryScalars() }

await harness.startCase("query-scalars-empty-string")
await harness.call { try await query.queryScalars(str: "") }

await harness.startCase("query-arrays-form")
await harness.call { try await query.queryArrays(formExplode: ["a", "b"], formNoExplode: ["c", "d"], dateTimes: [WHEN, WHEN]) }

await harness.startCase("query-arrays-delimited")
await harness.call { try await query.queryArrays(pipe: ["a", "b"], space: ["c", "d"]) }

await harness.startCase("query-arrays-empty")
await harness.call { try await query.queryArrays(formExplode: [], formNoExplode: [], dateTimes: []) }

await harness.startCase("query-objects-values")
await harness.call { try await query.queryObjects(explode: anObject(), noExplode: aPlainObject(), deep: anotherObject()) }

await harness.startCase("joined-values-encoded-once")
await harness.call { try await query.queryArrays(formExplode: ["a b"], formNoExplode: ["a b"]) }
await harness.call { try await query.queryObjects(noExplode: QueryObject(name: "a b", when: WHEN)) }

await harness.startCase("query-headers-values")
await harness.call { try await query.queryHeaders(xText: "hello", xNumbers: [1, 2]) }

await harness.startCase("query-cookies-values")
await harness.call { try await query.queryCookies(sessionId: "abc", theme: "dark") }

await harness.startCase("query-required-values")
await harness.call { try await query.queryRequired(needed: "needed value", xNeeded: "needed header") }

await harness.startCase("query-reserved-value")
await harness.call { try await query.queryScalars(str: QUERY_VALUE) }

await harness.startCase("query-path-segment")
await harness.call { try await query.queryPathSegment(value: PATH_SEGMENT) }

await harness.startCase("path-root")
await harness.call { try await root.root() }

await harness.startCase("form-scalars-values")
await harness.call { try await form.formScalars(request: FormScalarsRequest(str: "a", num: 1, flag: false, when: WHEN)) }

await harness.startCase("form-scalars-null")
await harness.call { try await form.formScalars(request: FormScalarsRequest(nullableStr: .null, nullableNum: .null, nullableFlag: .null, nullableWhen: .null)) }

await harness.startCase("form-scalars-absent")
await harness.call { try await form.formScalars(request: FormScalarsRequest()) }

await harness.startCase("form-arrays-values")
await harness.call { try await form.formArrays(request: FormArraysRequest(strs: ["a", "b"], pipeStrs: ["c", "d"])) }

await harness.startCase("form-arrays-null")
await harness.call { try await form.formArrays(request: FormArraysRequest(nullableStrs: .null, nullablePipeStrs: .null)) }

await harness.startCase("form-objects-values")
await harness.call { try await form.formObjects(request: FormObjectsRequest(obj: aPlainObject(), explodeObj: anObject(), deepObj: anotherObject())) }

await harness.startCase("form-objects-null")
await harness.call { try await form.formObjects(request: FormObjectsRequest(nullableObj: .null, nullableExplodeObj: .null, nullableDeepObj: .null)) }

await harness.startCase("form-arrays-delimited-explode")
await harness.call { try await form.formDelimitedExplode(request: FormDelimitedExplodeRequest(pipeStrs: ["a", "b"], spaceStrs: ["c", "d"])) }

await harness.startCase("form-optional-absent")
await harness.call { try await form.formOptional(request: nil) }

await harness.startCase("multipart-values")
await harness.call { try await multipart.multipartParts(request: .init(text: "a", json: anObject(), file: .init(value: File(data: Data("file content".utf8))))) }

await harness.startCase("multipart-json-content-type")
await harness.call { try await multipart.multipartParts(request: .init(json: anObject())) }

await harness.startCase("multipart-null")
await harness.call { try await multipart.multipartParts(request: .init(nullableText: .null, nullableJson: .null, nullableFile: .null)) }

await harness.startCase("json-null-properties")
await harness.call {
    try await json.jsonBody(request: JsonBody(
        name: "n",
        nullableName: .null,
        nullableCount: .null,
        nullableWhen: .null,
        nullableChild: .null,
        nullableList: .null
    ))
}

await harness.startCase("json-absent-properties")
await harness.call { try await json.jsonBody(request: JsonBody(name: "n")) }

await harness.startCase("body-array")
await harness.call { try await body.bodyArray(request: [anObject(), anotherObject()]) }

await harness.startCase("body-text")
await harness.call { try await body.bodyText(request: TEXT_BODY) }

await harness.startCase("body-binary")
await harness.call { try await body.bodyBinary(request: Data(BINARY_BODY.utf8)) }

await harness.startCase("body-shared-model")
await harness.call { try await body.bodySharedJson(request: SharedBody(name: "j", tags: ["a", "b"])) }
await harness.call { try await body.bodySharedForm(request: SharedBody(name: "f", tags: ["c", "d"])) }

await harness.startCase("response-json")
await harness.call { try await response.responseJson() }

await harness.startCase("response-content-type-charset")
await harness.call { try await response.responseJson() }

await harness.startCase("response-unknown-property")
await harness.call { try await response.responseJson() }

await harness.startCase("response-array")
await harness.call { try await response.responseArray() }

await harness.startCase("response-null-properties")
await harness.call({ try await response.responseNullable() }, reading: { result in
    switch result {
    case let ._200(model):
        return statesOf(model)
    }
})

await harness.startCase("response-headers")
await harness.call({ try await response.responseHeaders() }, reading: { result in
    switch result {
    case let ._200(value):
        return ["name": value.body.name, "totalCount": headerState(value.xTotalCount), "note": headerState(value.xNote)]
    }
})

await harness.startCase("response-empty-body")
await harness.call { try await response.responseJson() }

await harness.startCase("response-no-content-type")
await harness.call { try await response.responseJson() }

await harness.startCase("response-none")
await harness.call { try await response.responseNone() }

await harness.startCase("response-error")
await harness.call { try await response.responseError() }

/* The failure declares a header, so its result case carries the body and the header together */
await harness.startCase("response-error-body")
await harness.call({ try await response.responseError() }, reading: { result in
    switch result {
    case let ._200(model):
        return model
    case let ._400(value):
        return value.body
    }
})

await harness.startCase("response-error-headers")
await harness.callReading({ try await response.responseError() }, reading: { result in
    switch result {
    case ._200:
        return ["errorCode": "no failure"]
    case let ._400(value):
        return ["errorCode": headerState(value.xErrorCode)]
    }
})

await harness.startCase("response-header-list")
await harness.call({ try await response.responseHeaderTypes() }, reading: { result in
    switch result {
    case let ._200(value):
        return HeaderListReport(name: value.body.name, ids: value.xIds?.map { String($0) }, count: String(value.xCount))
    }
})

await harness.startCase("response-header-required-absent")
await harness.call { try await response.responseHeaderTypes() }

await harness.startCase("response-header-unparseable")
await harness.call { try await response.responseHeaderTypes() }

await harness.startCase("response-undocumented-status")
await harness.call { try await response.responseJson() }

await harness.startCase("security-api-key-header")
await harness.call { try await security.securityApiKeyHeader() }

await harness.startCase("security-api-key-query")
await harness.call { try await security.securityApiKeyQuery() }

await harness.startCase("security-bearer")
await harness.call { try await security.securityBearer() }

await harness.startCase("security-basic")
await harness.call { try await security.securityBasic() }

try harness.finish()
